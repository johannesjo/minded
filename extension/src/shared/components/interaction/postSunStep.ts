/**
 * The post-sun flow's one pending step (InteractionCommon): the beat between a
 * screen (the question, the breath, the choices) fading out and what comes
 * next arriving. One timer for the whole flow, so a newer step - a cancel
 * mid-hand-off, say - always replaces the older one instead of both landing.
 * Nothing runs once the host is disposed.
 */
export const createPostSunStep = (opts: {
  isDisposed: () => boolean;
  setIsScreenFading: (isFading: boolean) => void;
}): {
  after: (ms: number, run: () => void) => void;
  fadeScreenThen: (ms: number, swap: () => void) => void;
  clear: () => void;
} => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const clear = () => {
    if (timeout) clearTimeout(timeout);
    timeout = undefined;
  };
  const after = (ms: number, run: () => void) => {
    clear();
    timeout = setTimeout(() => {
      timeout = undefined;
      if (!opts.isDisposed()) run();
    }, ms);
  };
  // Fade the post-sun screen out, swap what it shows once it's gone, then
  // raise it again a frame later so the incoming screen eases in - the
  // out-then-in beat every in-flow hand-off uses, never a one-frame swap.
  const fadeScreenThen = (ms: number, swap: () => void) => {
    opts.setIsScreenFading(true);
    after(ms, () => {
      swap();
      requestAnimationFrame(() => opts.setIsScreenFading(false));
    });
  };
  return { after, fadeScreenThen, clear };
};
