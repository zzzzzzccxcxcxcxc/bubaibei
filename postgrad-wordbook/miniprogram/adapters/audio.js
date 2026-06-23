function createWxAudio(wxApi, files) {
  const context = wxApi.createInnerAudioContext();
  context.obeyMuteSwitch = false;

  let rejectCurrent = null;

  context.onEnded(() => {
    rejectCurrent = null;
  });
  context.onError((error) => {
    if (rejectCurrent) {
      rejectCurrent(error);
      rejectCurrent = null;
    }
  });

  return {
    stop() {
      context.stop();
      rejectCurrent = null;
    },

    play(relativePath) {
      context.stop();
      context.src = files.absolute(relativePath);
      return new Promise((resolve, reject) => {
        rejectCurrent = reject;
        context.play();
        resolve();
      });
    },

    destroy() {
      context.destroy();
      rejectCurrent = null;
    },
  };
}

module.exports = { createWxAudio };
