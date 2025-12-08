// Audio for sun interaction completion
import warmBellsPath from "@assets/warm-bells.mp3";
import warmBellsSequencePath from "@assets/warm-bells-sequence.mp3";

const soundPaths = [warmBellsPath, warmBellsSequencePath];

let audioContext: AudioContext | null = null;
let gainNode: GainNode | null = null;
let audioBuffers: Map<string, AudioBuffer> = new Map();
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

// Pick a random sound
function getRandomSoundPath(): string {
  return soundPaths[Math.floor(Math.random() * soundPaths.length)];
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

function playWithWebAudio(buffer: AudioBuffer): boolean {
  if (!audioContext || !gainNode) return false;

  try {
    // Resume context if suspended (autoplay policy)
    if (audioContext.state === "suspended") {
      audioContext.resume();
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

  const soundPath = getRandomSoundPath();

  // Try Web Audio API
  const buffer = await initWebAudio(soundPath);
  if (buffer && playWithWebAudio(buffer)) {
    return;
  }

  // Fallback to HTML Audio
  try {
    const audio = new Audio(getAudioUrl(soundPath));
    audio.volume = 0.75;
    await audio.play();
  } catch (err) {
    console.log("HTML Audio failed:", err);
  }
}

// Preload both sounds for faster playback
export async function preloadSounds(): Promise<void> {
  await Promise.all(soundPaths.map((path) => initWebAudio(path)));
}
