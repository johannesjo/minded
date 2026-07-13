import { addUsageTimeInBackground } from "@src/dataInterface/extension/extensionApi";

/**
 * Tracks real foreground time on a blocked host and reports it to the
 * background, where it's stored as observed `usageStats`. "Foreground" means the
 * tab is actually visible AND focused - background tabs and blurred windows
 * don't count, so this measures attention, not just an open tab.
 *
 * There's no browser API for true site dwell time, so we accumulate it here and
 * flush periodically (and whenever the page is hidden/unloaded). This is the
 * web counterpart to Android reading real per-app time from the OS.
 */

const FLUSH_INTERVAL_MS = 15_000;

export const startUsageTimeTracking = (host: string): (() => void) => {
  if (!host) return () => undefined;

  let pendingSeconds = 0;
  let activeSince: number | null = null;
  let stopped = false;

  const isActive = (): boolean =>
    document.visibilityState === "visible" && document.hasFocus();

  // Settle whatever foreground time has elapsed since we last looked, then
  // re-arm the clock based on the current active state.
  const settle = () => {
    const now = Date.now();
    if (activeSince !== null) {
      pendingSeconds += (now - activeSince) / 1000;
    }
    activeSince = isActive() ? now : null;
  };

  const flush = () => {
    settle();
    const whole = Math.floor(pendingSeconds);
    if (whole >= 1) {
      pendingSeconds -= whole;
      // Fire-and-forget; periodic flushes mean a dropped message is no big deal.
      void addUsageTimeInBackground(host, whole).catch(() => undefined);
    }
  };

  const onVisibilityOrFocus = () => settle();
  const onHide = () => flush();

  document.addEventListener("visibilitychange", onVisibilityOrFocus);
  window.addEventListener("focus", onVisibilityOrFocus);
  window.addEventListener("blur", onVisibilityOrFocus);
  window.addEventListener("pagehide", onHide);
  window.addEventListener("beforeunload", onHide);

  const interval = self.setInterval(flush, FLUSH_INTERVAL_MS);

  // Prime the clock.
  activeSince = isActive() ? Date.now() : null;

  return () => {
    if (stopped) return;
    stopped = true;
    flush();
    self.clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisibilityOrFocus);
    window.removeEventListener("focus", onVisibilityOrFocus);
    window.removeEventListener("blur", onVisibilityOrFocus);
    window.removeEventListener("pagehide", onHide);
    window.removeEventListener("beforeunload", onHide);
  };
};
