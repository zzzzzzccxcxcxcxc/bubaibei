export type Accent = 'uk' | 'us';

export function createAudioService(deps: {
  createPlayer: () => {
    stop: () => void;
    setSource: (src: string) => void;
    play: () => Promise<void>;
  };
  resolveUrl: (wordId: string, accent: Accent) => string | null;
}) {
  const player = deps.createPlayer();
  return {
    async play(wordId: string, accent: Accent) {
      const url = deps.resolveUrl(wordId, accent);
      if (!url) throw new Error('AUDIO_SOURCE_UNAVAILABLE');
      player.stop();
      player.setSource(url);
      await player.play();
    },
  };
}

export function createHtmlAudioPlayer(audio = new Audio()) {
  return {
    stop() {
      audio.pause();
      audio.currentTime = 0;
    },
    setSource(src: string) {
      audio.src = src;
    },
    async play() {
      await audio.play();
    },
  };
}
