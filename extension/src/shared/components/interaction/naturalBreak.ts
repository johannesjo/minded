/**
 * The natural break: when the Little Sun is due to hand back to the full pause
 * mid-session (grace used up, a chosen time run out, the periodic re-question),
 * it doesn't cut in at that second. It waits for the user to finish what they
 * are doing - a pause that lands mid-sentence or mid-video reads as a jolt and
 * gets tapped away, the very reflex the mid-session pause exists to avoid.
 *
 * What counts as a break is only ever *observed behaviour*, never a guess:
 *
 * - **Moving to another page** (including the in-page navigations single-page
 *   sites make). One thing is finished and the next hasn't started.
 * - **Coming back to the tab** after leaving it.
 * - **Scrolling - but only after a while** (`SCROLL_FALLBACK_MS`). Reading an
 *   article is scrolling too, so scrolling alone would land the pause mid-read;
 *   a feed, though, can be scrolled for an hour without the address ever
 *   changing. So reading gets a few more minutes, and after that the next
 *   scroll is the break - the doom-scroll moment the pause is for.
 *
 * Only user-driven scrolling counts (wheel, touch, scroll keys outside a text
 * field): a page that scrolls itself (a chat pulling in new messages) is not
 * the user doing anything.
 */
export const SCROLL_FALLBACK_MS = 3 * 60 * 1000;

const NAVIGATION_POLL_MS = 1000;

const SCROLL_KEYS = new Set([
  " ",
  "PageDown",
  "PageUp",
  "ArrowDown",
  "ArrowUp",
  "End",
  "Home",
]);

/** The slice of `window` the watcher needs - injectable for tests. */
export interface NaturalBreakEnv {
  target: EventTarget;
  doc: EventTarget & { visibilityState: string };
  getHref: () => string;
  setInterval: (fn: () => void, ms: number) => unknown;
  clearInterval: (id: unknown) => void;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
}

const getWindowEnv = (): NaturalBreakEnv => ({
  target: window,
  doc: document,
  getHref: () => window.location.href,
  setInterval: (fn, ms) => window.setInterval(fn, ms),
  clearInterval: (id) => window.clearInterval(id as number),
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (id) => window.clearTimeout(id as number),
});

/** The page, ignoring the #fragment: jumping to a heading isn't a new page. */
const toPageKey = (href: string): string => href.split("#")[0];

const isEditableTarget = (target: EventTarget | null): boolean => {
  const el = target as {
    isContentEditable?: boolean;
    tagName?: string;
  } | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName?.toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
};

/**
 * Calls `onBreak` once, at the next natural break. Returns a cancel function;
 * calling it (or the break firing) removes every listener and timer.
 */
export const waitForNaturalBreak = (
  onBreak: () => void,
  options: { env?: NaturalBreakEnv; scrollFallbackMs?: number } = {},
): (() => void) => {
  const env = options.env ?? getWindowEnv();
  const scrollFallbackMs = options.scrollFallbackMs ?? SCROLL_FALLBACK_MS;
  const startPage = toPageKey(env.getHref());
  const removers: Array<() => void> = [];
  let isDone = false;

  const listen = (
    target: EventTarget,
    type: string,
    fn: (ev: Event) => void,
  ) => {
    const opts = { capture: true, passive: true };
    target.addEventListener(type, fn, opts);
    removers.push(() => target.removeEventListener(type, fn, opts));
  };

  const cancel = () => {
    if (isDone) return;
    isDone = true;
    env.clearInterval(navigationPoll);
    env.clearTimeout(scrollFallback);
    removers.forEach((remove) => remove());
  };

  const fire = () => {
    if (isDone) return;
    cancel();
    onBreak();
  };

  const checkNavigation = () => {
    if (toPageKey(env.getHref()) !== startPage) fire();
  };

  // Single-page sites change the address without a reload, and a content
  // script can't see the page's own history calls, so the address is polled.
  const navigationPoll = env.setInterval(checkNavigation, NAVIGATION_POLL_MS);
  listen(env.target, "popstate", checkNavigation);

  // Back in the tab after being somewhere else.
  let wasHidden = env.doc.visibilityState === "hidden";
  listen(env.doc, "visibilitychange", () => {
    if (env.doc.visibilityState === "hidden") {
      wasHidden = true;
    } else if (wasHidden) {
      fire();
    }
  });

  const scrollFallback = env.setTimeout(() => {
    if (isDone) return;
    listen(env.target, "wheel", fire);
    listen(env.target, "touchmove", fire);
    listen(env.target, "keydown", (ev) => {
      const key = (ev as KeyboardEvent).key;
      if (SCROLL_KEYS.has(key) && !isEditableTarget(ev.target)) fire();
    });
  }, scrollFallbackMs);

  return cancel;
};
