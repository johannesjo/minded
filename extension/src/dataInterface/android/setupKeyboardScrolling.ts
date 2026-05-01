const FIELD_BOTTOM_MARGIN = 24;

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

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleVisibilityCheck);
    window.visualViewport.addEventListener("scroll", scheduleVisibilityCheck);
  } else {
    window.addEventListener("resize", scheduleVisibilityCheck);
  }
}
