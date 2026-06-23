const {
  AUDIO_ERROR,
  createAudioCacheService,
} = require('../miniprogram/services/audio-cache-service');

function createHarness({
  cached = {},
  maxBytes = 1000,
  downloadError = null,
} = {}) {
  const index = structuredClone(cached);
  const files = {
    exists: jest.fn(async (path) => Boolean(index[path])),
    copyVerified: jest.fn(async () => {}),
    copy: jest.fn(async (_source, destination) => {
      index[destination] = index[destination] || {
        path: destination,
        bytes: 300,
        lastUsedAt: 0,
      };
    }),
    removeFile: jest.fn(async (path) => {
      delete index[path];
    }),
    fileSize: jest.fn(async () => 300),
  };
  const cloud = {
    download: jest.fn(async () => {
      if (downloadError) throw downloadError;
      return '/tmp/audio.mp3';
    }),
  };
  const player = {
    play: jest.fn(async () => {}),
    stop: jest.fn(),
  };
  const metadata = {
    getAudioFileId: jest.fn(async (wordId, accent) =>
      `cloud://audio/${wordId}-${accent}.mp3`
    ),
  };
  const storageState = {
    'audio-cache:v1': {
      entries: Object.fromEntries(
        Object.values(index).map((entry) => [entry.path, entry])
      ),
    },
  };
  const storage = {
    get: jest.fn(async (key, fallback) =>
      structuredClone(storageState[key] ?? fallback)
    ),
    set: jest.fn(async (key, value) => {
      storageState[key] = structuredClone(value);
    }),
  };
  const service = createAudioCacheService({
    cloud,
    files,
    maxBytes,
    metadata,
    now: () => 100,
    player,
    storage,
  });
  return { cloud, files, index, player, service, storageState };
}

test('plays cached UK audio without downloading again', async () => {
  const path = 'audio/word_abandon-uk.mp3';
  const { cloud, player, service } = createHarness({
    cached: {
      [path]: { path, bytes: 200, lastUsedAt: 1 },
    },
  });

  await service.play('word_abandon', 'uk');

  expect(cloud.download).not.toHaveBeenCalled();
  expect(player.stop).toHaveBeenCalledTimes(1);
  expect(player.play).toHaveBeenCalledWith(path);
});

test('downloads and caches missing US audio before playback', async () => {
  const { cloud, files, player, service, storageState } = createHarness();

  await service.play('word_abandon', 'us');

  expect(cloud.download).toHaveBeenCalledWith(
    'cloud://audio/word_abandon-us.mp3'
  );
  expect(files.copy).toHaveBeenCalledWith(
    '/tmp/audio.mp3',
    'audio/word_abandon-us.mp3'
  );
  expect(player.play).toHaveBeenCalledWith('audio/word_abandon-us.mp3');
  expect(storageState['audio-cache:v1'].entries[
    'audio/word_abandon-us.mp3'
  ]).toEqual(expect.objectContaining({ bytes: 300, lastUsedAt: 100 }));
});

test('evicts least recently used files before saving new audio', async () => {
  const oldPath = 'audio/old.mp3';
  const newPath = 'audio/new.mp3';
  const { files, service } = createHarness({
    cached: {
      [oldPath]: { path: oldPath, bytes: 700, lastUsedAt: 1 },
      [newPath]: { path: newPath, bytes: 200, lastUsedAt: 2 },
    },
    maxBytes: 1000,
  });

  await service.reserve(300);

  expect(files.removeFile).toHaveBeenCalledWith(oldPath);
  expect(await service.getCacheStats()).toEqual({
    bytes: 200,
    count: 1,
    maxBytes: 1000,
  });
});

test('maps download failures to a non-blocking audio error', async () => {
  const { service } = createHarness({
    downloadError: new Error('network unavailable'),
  });

  await expect(service.play('word_abandon', 'uk')).rejects.toMatchObject({
    code: AUDIO_ERROR.NETWORK,
  });
});

test('clears every cached file and resets cache stats', async () => {
  const path = 'audio/word_abandon-uk.mp3';
  const { files, service } = createHarness({
    cached: {
      [path]: { path, bytes: 200, lastUsedAt: 1 },
    },
  });

  await service.clearCache();

  expect(files.removeFile).toHaveBeenCalledWith(path);
  expect(await service.getCacheStats()).toEqual({
    bytes: 0,
    count: 0,
    maxBytes: 1000,
  });
});
