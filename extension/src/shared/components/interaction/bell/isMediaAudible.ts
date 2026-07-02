/**
 * Whether a bell rung right now could actually be heard.
 *
 * On Android the WebView plays through the media stream, which the silent/
 * vibrate ringer switch does NOT mute — "phone on silent" usually still hears
 * the bell. What does break the practice is the media volume turned all the
 * way down, so newer app builds expose it via the native bridge
 * (`getMediaVolume`, 0–100, -1 when unknown). Anything unknown — no bridge,
 * an older APK, a bridge error, or a desktop browser (system mute is not
 * readable from a content script) — counts as audible: the listen screen still
 * works as a watch-the-glow-settle moment, so failing open degrades softly
 * while failing closed would silently remove the mode for everyone.
 */
export const getIsMediaAudible = (): boolean => {
  try {
    return window.androidMinded?.getMediaVolume?.() !== 0;
  } catch {
    return true;
  }
};
