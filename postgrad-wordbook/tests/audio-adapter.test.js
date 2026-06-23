const { createWxAudio } = require('../miniprogram/adapters/audio');

function createContextHarness() {
  const handlers = {};
  const context = {
    src: '',
    stop: jest.fn(),
    play: jest.fn(),
    destroy: jest.fn(),
    onPlay(handler) {
      handlers.play = handler;
    },
    onEnded(handler) {
      handlers.ended = handler;
    },
    onError(handler) {
      handlers.error = handler;
    },
  };
  const wxApi = { createInnerAudioContext: () => context };
  const files = { absolute: (path) => `wxfile://usr/${path}` };
  return { context, files, handlers, wxApi };
}

test('resolves only after the platform reports playback started', async () => {
  const { context, files, handlers, wxApi } = createContextHarness();
  const audio = createWxAudio(wxApi, files);
  let settled = false;
  const promise = audio.play('audio/a.mp3').then(() => {
    settled = true;
  });
  await Promise.resolve();
  expect(settled).toBe(false);
  expect(context.src).toBe('wxfile://usr/audio/a.mp3');
  handlers.play();
  await promise;
  expect(settled).toBe(true);
});

test('rejects when the platform reports a playback error', async () => {
  const { files, handlers, wxApi } = createContextHarness();
  const audio = createWxAudio(wxApi, files);
  const promise = audio.play('audio/a.mp3');
  handlers.error({ errCode: 10001 });
  await expect(promise).rejects.toEqual({ errCode: 10001 });
});
