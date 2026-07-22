import { prefersReducedMotion } from "@src/util/prefersReducedMotion";

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
  if (prefersReducedMotion()) {
    el.style.opacity = "0";
    el.style.transition = "none";
    el.style.transitionDelay = "";
    return { frameNr: 0, promise: Promise.resolve() };
  }

  el.style.opacity = "1";
  el.style.transition = `opacity ${duration}ms var(--ease-out)`;
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

// Routine navigation should feel responsive while still easing between surfaces.
// The longer ~900ms motion tier is reserved for the signature sun morphs and calm
// arrival beats, not every page change.
export const PAGE_FADE_MS = 240;

// Fade `el` fully out over the page-fade beat, then run `done` - the shared
// core of every "leaving surface eases out before the next eases in" swap
// (Android top-level surface swaps, onboarding step changes). Under reduced
// motion, or with nothing to fade, it skips straight to `done` synchronously.
// Re-entrancy (a second tap mid-fade) is call-site policy, so guards stay with
// the callers.
export function fadeOutThen(el: HTMLElement | null, done: () => void): void {
  if (!el || prefersReducedMotion()) {
    done();
    return;
  }
  fadeOut(el, PAGE_FADE_MS).promise.then(done);
}

// Fade the current page's own root node (`<main>`'s first child) fully out and
// resolve once it's gone - so the leaving surface is gone before the destination
// eases in via its own pageTransitionIn (a clean sequential fade, never a hard
// cut or a cross-fade). We fade the page node, not <main> itself, so it's simply
// discarded when the route remounts: nothing to reset, no flash of the old page
// at full opacity. The bottom bar and companion sun live outside <main>, so they
// stay put through the move.
//
// The single caller is the router-level page-fade interceptor in RouteCmp
// (`useBeforeLeave`), which then retries the navigation so the route remounts
// and cleans up the faded node. It only calls this for real page-to-page moves
// (never a same-path/query-only change, which would strand the node at opacity
// 0) and skips reduced motion itself, so there's nothing to guard here.
// Resolves immediately if there's no page node yet.
export function fadeOutCurrentPage(duration = PAGE_FADE_MS): Promise<void> {
  const leavingPage = document.querySelector("main")
    ?.firstElementChild as HTMLElement | null;

  if (!leavingPage) return Promise.resolve();

  return fadeOut(leavingPage, duration).promise;
}
