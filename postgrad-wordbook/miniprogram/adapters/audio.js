function createWxAudio(wxApi, files) {
  const context = wxApi.createInnerAudioContext();
  context.obeyMuteSwitch = false;

  let resolveCurrent = null;
  let rejectCurrent = null;

  function clearPending() {
    resolveCurrent = null;
    rejectCurrent = null;
  }

  context.onPlay(() => {
    if (resolveCurrent) resolveCurrent();
    clearPending();
  });
  context.onEnded(() => {
    clearPending();
  });
  context.onError((error) => {
    if (rejectCurrent) rejectCurrent(error);
    clearPending();
  });

  return {
    stop() {
      context.stop();
      if (rejectCurrent) {
        rejectCurrent({ errMsg: 'audio playback interrupted' });
      }
      clearPending();
    },

    play(relativePath) {
      context.stop();
      context.src = files.absolute(relativePath);
      return new Promise((resolve, reject) => {
        resolveCurrent = resolve;
        rejectCurrent = reject;
        context.play();
      });
    },

    destroy() {
      context.destroy();
      clearPending();
    },
  };
}

module.exports = { createWxAudio };
