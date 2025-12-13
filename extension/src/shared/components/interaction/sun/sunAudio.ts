// Audio for sun interaction completion
import warmBellsPath from "@assets/warm-bells.mp3";
import warmBellsSequencePath from "@assets/warm-bells-sequence.mp3";
import singleBellPath from "@assets/single-bell.mp3";

const completionSoundPaths = [warmBellsPath, warmBellsSequencePath];

let audioContext: AudioContext | null = null;
let gainNode: GainNode | null = null;
const audioBuffers: Map<string, AudioBuffer> = new Map();
let soundEnabled = true;
const VOLUME = 0.75;

// Get the correct URL for the audio file (handles extension context)
function getAudioUrl(path: string): string {
  // In extension context, use chrome.runtime.getURL
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(path);
  }
  // Otherwise use the imported path directly (Android/iOS webview)
  return path;
}

// Pick a random completion sound
function getRandomCompletionSoundPath(): string {
  return completionSoundPaths[
    Math.floor(Math.random() * completionSoundPaths.length)
  ];
}

// Initialize Web Audio API and load a sound
async function initWebAudio(soundPath: string): Promise<AudioBuffer | null> {
  if (audioBuffers.has(soundPath)) {
    return audioBuffers.get(soundPath)!;
  }

  try {
    if (!audioContext) {
      audioContext = new AudioContext();
      gainNode = audioContext.createGain();
      gainNode.gain.value = VOLUME;
      gainNode.connect(audioContext.destination);
    }
    const audioUrl = getAudioUrl(soundPath);
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await audioContext.decodeAudioData(arrayBuffer);
    audioBuffers.set(soundPath, buffer);
    return buffer;
  } catch (err) {
    console.log("Web Audio init failed:", err);
    return null;
  }
}

async function playWithWebAudio(buffer: AudioBuffer): Promise<boolean> {
  if (!audioContext || !gainNode) return false;

  try {
    // Resume context if suspended (autoplay policy)
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode);
    source.start(0);
    return true;
  } catch (err) {
    console.log("Web Audio playback failed:", err);
    return false;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export async function playCompletionSound(): Promise<void> {
  if (!soundEnabled) return;

  const soundPath = getRandomCompletionSoundPath();

  // Try Web Audio API
  const buffer = await initWebAudio(soundPath);
  if (buffer && (await playWithWebAudio(buffer))) {
    return;
  }

  // Fallback to HTML Audio
  try {
    const audio = new Audio(getAudioUrl(soundPath));
    audio.volume = VOLUME;

    try {
      await audio.play();
    } catch (playError) {
      // NotAllowedError is expected when autoplay is blocked by browser policy
      // This typically happens on first interaction before user gesture
      if (playError instanceof Error && playError.name === "NotAllowedError") {
        console.debug("Audio autoplay blocked by browser policy");
      } else {
        console.warn("Audio playback failed:", playError);
      }
    }
  } catch (err) {
    console.warn("HTML Audio initialization failed:", err);
  }
}

export async function playInterventionSound(): Promise<void> {
  if (!soundEnabled) return;

  // Try Web Audio API
  const buffer = await initWebAudio(singleBellPath);
  if (buffer && (await playWithWebAudio(buffer))) {
    return;
  }

  // Fallback to HTML Audio
  try {
    const audio = new Audio(getAudioUrl(singleBellPath));
    audio.volume = VOLUME;

    try {
      await audio.play();
    } catch (playError) {
      if (playError instanceof Error && playError.name === "NotAllowedError") {
        console.debug("Audio autoplay blocked by browser policy");
      } else {
        console.warn("Audio playback failed:", playError);
      }
    }
  } catch (err) {
    console.warn("HTML Audio initialization failed:", err);
  }
}

// Preload all sounds for faster playback
export async function preloadSounds(): Promise<void> {
  await Promise.all(
    [...completionSoundPaths, singleBellPath].map((path) => initWebAudio(path)),
  );
}
