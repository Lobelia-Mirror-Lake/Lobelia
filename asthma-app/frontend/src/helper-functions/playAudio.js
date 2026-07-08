let buzzAudio;

export function playErrorBuzz() {
  playAudio(buzzAudio, "error-buzz.mp3")
}

function playAudio(audio, filename) {
  if (!audio) preloadAudio();
  audio.currentTime = 0;
  audio.play();
}

export function preloadAudio() {
  buzzAudio = new Audio("/Mirror-Lake/sounds/error-buzz.mp3");
  buzzAudio.load();
}