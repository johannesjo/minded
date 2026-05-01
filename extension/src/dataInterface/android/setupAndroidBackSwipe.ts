const EDGE_WIDTH = 28;
const MIN_SWIPE_X = 72;
const MAX_SWIPE_Y = 56;

const isEditable = (target: EventTarget | null): boolean =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement ||
  (target instanceof HTMLElement && target.isContentEditable);

const isAtDashboard = (): boolean => {
  const hash = window.location.hash;
  return hash === "" || hash === "#" || hash === "#/";
};

export const setupAndroidBackSwipe = (): void => {
  let startX = 0;
  let startY = 0;
  let tracking = false;

  document.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.touches[0];
      tracking =
        !!touch && touch.clientX <= EDGE_WIDTH && !isEditable(event.target);
      if (!tracking || !touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
    },
    { passive: true },
  );

  document.addEventListener(
    "touchend",
    (event) => {
      if (!tracking) return;
      tracking = false;
      const touch = event.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - startX;
      const deltaY = Math.abs(touch.clientY - startY);
      if (deltaX < MIN_SWIPE_X || deltaY > MAX_SWIPE_Y || isAtDashboard()) {
        return;
      }

      window.history.back();
    },
    { passive: true },
  );
};
