export function promiseTimeout(duration: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}

export function fadeOut(el: HTMLElement, duration = 200): {
  promise: Promise<void>,
  frameNr: number,
} {
  el.style.opacity = "1";
  el.style.transition = `opacity ${duration}ms`;

  return {
    frameNr: window.requestAnimationFrame(() => {
      el.style.opacity = "0";
    }),
    promise: promiseTimeout(duration),
  };
}
