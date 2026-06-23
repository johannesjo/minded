export function promiseTimeout(duration: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}

export function fadeOut(
  el: HTMLElement,
  duration = 200,
  initialDelay = 0,
): {
  promise: Promise<void>;
  frameNr: number;
} {
  el.style.opacity = "1";
  el.style.transition = `opacity ${duration}ms ease-in`;
  if (initialDelay) {
    el.style.transitionDelay = `${initialDelay}ms`;
  }

  return {
    frameNr: window.requestAnimationFrame(() => {
      el.style.opacity = "0";
    }),
    promise: promiseTimeout(duration + initialDelay),
  };
}

// Page-level fade duration: matches --dur-soft so every page-to-page move eases
// out at the same pace it eases back in (standardPageTransitionIn) — never a
// hard cut (see the "transitions — always soft" styling rule).
export const PAGE_FADE_MS = 480;

export const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Guards against a second tap re-triggering the fade while one is mid-flight
// (e.g. a double-tap on a dashboard card), which would otherwise stack
// navigations or strand a half-faded node.
let isPageLeaving = false;

// Fade the current page fully out, *then* navigate — so the leaving surface is
// gone before the destination eases in via its own pageTransitionIn (a clean
// sequential fade rather than a hard cut or a cross-fade). We fade the page's
// own root node (`<main>`'s first child), not <main> itself, so it's simply
// discarded when the route remounts: nothing to reset, no flash of the old page
// at full opacity. The bottom bar and companion sun live outside <main>, so
// they stay put through the move.
//
// Caller must target a *different* route: the faded node is only cleaned up by
// the route remounting it. A same-route move (e.g. a query-only change) would
// leave it stuck at opacity 0. Same-route view swaps should fade in place
// instead (see the wind-down dismiss / "show all" reveal).
export function navigateWithPageFadeOut(
  navigate: (path: string) => void,
  path: string,
  duration = PAGE_FADE_MS,
): void {
  if (isPageLeaving) return;

  const leavingPage = document.querySelector("main")
    ?.firstElementChild as HTMLElement | null;

  if (!leavingPage || prefersReducedMotion()) {
    navigate(path);
    return;
  }

  isPageLeaving = true;
  fadeOut(leavingPage, duration).promise.then(() => {
    isPageLeaving = false;
    navigate(path);
  });
}
