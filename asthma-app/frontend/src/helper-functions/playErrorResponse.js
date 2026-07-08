import { playErrorBuzz } from "./playAudio";

export function playErrorResponse(setShake) {
    navigator.vibrate?.(100);
    playErrorBuzz();
    setShake(true);
    setTimeout(() => setShake(false), 300);
}

export default playErrorResponse;