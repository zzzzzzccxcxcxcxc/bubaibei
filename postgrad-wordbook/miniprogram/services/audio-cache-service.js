const AUDIO_CACHE_KEY = 'audio-cache:v1';
const DEFAULT_MAX_BYTES = 30 * 1024 * 1024;

const AUDIO_ERROR = Object.freeze({
  NETWORK: 'AUDIO_NETWORK_ERROR',
  SOURCE: 'AUDIO_SOURCE_UNAVAILABLE',
  STORAGE: 'AUDIO_STORAGE_FULL',
});

function audioError(code, cause) {
  const error = new Error(code);
  error.code = code;
  error.cause = cause;
  return error;
}

function createAudioCacheService({
  cloud,
  files,
  maxBytes = DEFAULT_MAX_BYTES,
  metadata,
  now = Date.now,
  player,
  storage,
}) {
  async function readIndex() {
    return storage.get(AUDIO_CACHE_KEY, { entries: {} });
  }

  async function writeIndex(index) {
    await storage.set(AUDIO_CACHE_KEY, index);
  }

  async function getCacheStats() {
    const index = await readIndex();
    const entries = Object.values(index.entries);
    return {
      bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
      count: entries.length,
      maxBytes,
    };
  }

  async function reserve(requiredBytes) {
    const index = await readIndex();
    const entries = Object.values(index.entries);
    let currentBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
    const candidates = entries.slice().sort(
      (left, right) => left.lastUsedAt - right.lastUsedAt
    );

    while (currentBytes + requiredBytes > maxBytes && candidates.length > 0) {
      const entry = candidates.shift();
      await files.removeFile(entry.path);
      delete index.entries[entry.path];
      currentBytes -= entry.bytes;
    }
    if (currentBytes + requiredBytes > maxBytes) {
      throw audioError(AUDIO_ERROR.STORAGE);
    }
    await writeIndex(index);
  }

  async function touch(path, bytes) {
    const index = await readIndex();
    index.entries[path] = {
      path,
      bytes,
      lastUsedAt: now(),
    };
    await writeIndex(index);
  }

  async function resolveCachedPath(wordId, accent) {
    const path = `audio/${wordId}-${accent}.mp3`;
    const index = await readIndex();
    const entry = index.entries[path];
    if (entry && await files.exists(path)) {
      await touch(path, entry.bytes);
      return path;
    }

    const fileId = await metadata.getAudioFileId(wordId, accent);
    if (!fileId) throw audioError(AUDIO_ERROR.SOURCE);

    let tempPath;
    try {
      tempPath = await cloud.download(fileId);
    } catch (error) {
      throw audioError(AUDIO_ERROR.NETWORK, error);
    }

    const bytes = await files.fileSize(tempPath);
    await reserve(bytes);
    try {
      await files.copy(tempPath, path);
    } catch (error) {
      throw audioError(AUDIO_ERROR.STORAGE, error);
    }
    await touch(path, bytes);
    return path;
  }

  return {
    reserve,
    getCacheStats,

    async play(wordId, accent) {
      if (!['uk', 'us'].includes(accent)) {
        throw audioError(AUDIO_ERROR.SOURCE);
      }
      const path = await resolveCachedPath(wordId, accent);
      player.stop();
      await player.play(path);
      return path;
    },

    stop() {
      player.stop();
    },

    async clearCache() {
      const index = await readIndex();
      await Promise.all(
        Object.keys(index.entries).map((path) => files.removeFile(path))
      );
      await writeIndex({ entries: {} });
    },
  };
}

module.exports = {
  AUDIO_CACHE_KEY,
  AUDIO_ERROR,
  DEFAULT_MAX_BYTES,
  createAudioCacheService,
};
