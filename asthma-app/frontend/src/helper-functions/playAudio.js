const audioContext = new AudioContext();

const sounds = {};

const soundFiles = {
  buzz: "error-buzz.mp3",
};

export async function preloadAudio() {
  const promises = Object.entries(soundFiles).map(
    async ([name, file]) => {
      const response = await fetch(`/Mirror-Lake/sounds/${file}`);
      const arrayBuffer = await response.arrayBuffer();

      const audioBuffer = await audioContext.decodeAudioData(
        arrayBuffer
      );

      sounds[name] = audioBuffer;
    }
  );

  await Promise.all(promises);
}

export function playAudio(name) {
  const buffer = sounds[name];

  if (!buffer) {
    console.warn(`Sound "${name}" not loaded`);
    return;
  }

  // unlock browser audio if needed
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  const source = audioContext.createBufferSource();

  source.buffer = buffer;
  source.connect(audioContext.destination);

  source.start(0);
}