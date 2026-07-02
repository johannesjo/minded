const FIELD_BOTTOM_MARGIN = 24;

// Single signal for "the keyboard is up" across the Android web layer. Consumed
// by CSS (e.g. hiding the bottom bar — see BottomBar.module.scss). Formerly set
// by a native global-layout probe in MyWebView; now derived here from a focused
// text field so there is one source of truth (plus a viewport-growth backstop
// for the back-gesture IME dismiss, which hides the keyboard without blurring).
const KEYBOARD_OPEN_CLASS = "androidKeyboardOpen";

// Input types that never summon a keyboard (toggles, pickers, buttons):
// focusing one — e.g. tapping a settings checkbox — must not count as text
// entry, or the class would hide the bottom bar with no keyboard on screen.
const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

const isTextEntry = (el: EventTarget | null): boolean =>
  el instanceof HTMLTextAreaElement ||
  (el instanceof HTMLInputElement && !NON_TEXT_INPUT_TYPES.has(el.type)) ||
  (el instanceof HTMLElement && el.isContentEditable);

const getActiveField = (): HTMLInputElement | HTMLTextAreaElement | null => {
  const target = document.activeElement;
  if (
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLInputElement
  ) {
    return target;
  }
  return null;
};

const getViewportBottom = (): number => {
  const viewport = window.visualViewport;
  if (!viewport) return window.innerHeight;
  return viewport.offsetTop + viewport.height;
};

const getScrollContainer = (
  target: HTMLElement,
): HTMLElement | (Element & { scrollTop: number }) | null => {
  let el = target.parentElement;
  while (el) {
    const style = window.getComputedStyle(el);
    const canScrollY =
      /(auto|scroll)/.test(style.overflowY) &&
      el.scrollHeight > el.clientHeight;
    if (canScrollY) return el;
    el = el.parentElement;
  }
  return document.scrollingElement as Element & { scrollTop: number };
};

const scrollByAmount = (target: HTMLElement, top: number): void => {
  const scrollContainer = getScrollContainer(target);
  if (!scrollContainer) {
    window.scrollBy({ top, behavior: "smooth" });
    return;
  }
  scrollContainer.scrollTop += top;
};

const keepActiveFieldVisible = (): void => {
  const target = getActiveField();
  if (!target) return;

  const rect = target.getBoundingClientRect();
  const viewportBottom = getViewportBottom();
  const overlap = rect.bottom + FIELD_BOTTOM_MARGIN - viewportBottom;

  if (overlap > 0) {
    scrollByAmount(target, overlap);
    return;
  }

  if (rect.top < FIELD_BOTTOM_MARGIN) {
    scrollByAmount(target, rect.top - FIELD_BOTTOM_MARGIN);
  }
};

/**
 * Keeps focused form fields above the Android keyboard. A single focus-time
 * scroll is not enough on WebView because the visual viewport continues to
 * move while the keyboard animates.
 */
export function setupKeyboardScrolling(): void {
  const scheduleVisibilityCheck = () => {
    keepActiveFieldVisible();
    setTimeout(keepActiveFieldVisible, 120);
    setTimeout(keepActiveFieldVisible, 320);
  };

  document.addEventListener(
    "focus",
    (event) => {
      const target = event.target;
      if (
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLInputElement
      ) {
        scheduleVisibilityCheck();
      }
    },
    true,
  );
  document.addEventListener("input", scheduleVisibilityCheck, true);

  // Toggle the keyboard-open class off a focused text field rather than a
  // measured viewport delta: with native adjustResize/imePadding the window is
  // already resized for the IME, so visualViewport reports no usable gap. A
  // focused field is the exact, threshold-free signal.
  const syncKeyboardOpenClass = () => {
    document.body.classList.toggle(
      KEYBOARD_OPEN_CLASS,
      isTextEntry(document.activeElement),
    );
  };
  document.addEventListener("focusin", syncKeyboardOpenClass);
  // focusout fires before focus lands on the next field; re-check next frame so
  // tabbing field→field doesn't flicker the class (and the bottom bar) off/on.
  document.addEventListener("focusout", () =>
    requestAnimationFrame(syncKeyboardOpenClass),
  );

  // Focus alone can't see the back-gesture IME dismiss: Android hides the
  // keyboard without blurring the field, so no focusout ever fires and the
  // class (and hidden bottom bar) would stick. The signal that survives is the
  // window growing back — adjustResize shrank it for the IME — so a meaningful
  // height gain while a text field is focused means the keyboard left. Blur the
  // field so focus and keyboard state agree again (the focusout path above then
  // clears the class, and a re-tap cleanly re-opens both).
  const getViewportHeight = (): number =>
    window.visualViewport?.height ?? window.innerHeight;
  // Above inset/rounding jitter, well below any keyboard's height.
  const IME_CLOSED_MIN_GROW_PX = 60;
  let lastViewportHeight = getViewportHeight();
  const blurFieldOnImeClose = () => {
    const height = getViewportHeight();
    const grewBy = height - lastViewportHeight;
    lastViewportHeight = height;
    if (grewBy < IME_CLOSED_MIN_GROW_PX) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && isTextEntry(active)) active.blur();
  };

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleVisibilityCheck);
    window.visualViewport.addEventListener("resize", blurFieldOnImeClose);
    window.visualViewport.addEventListener("scroll", scheduleVisibilityCheck);
  } else {
    window.addEventListener("resize", scheduleVisibilityCheck);
    window.addEventListener("resize", blurFieldOnImeClose);
  }
}
