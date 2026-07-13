import { createSignal, onCleanup, type Accessor } from "solid-js";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";

/**
 * Shared in-component screen crossfade - the one "fade out → swap → fade in" for
 * overlays that move between their OWN screens (the grounding offer↔sit↔praise,
 * urge-surfing's phases) instead of each rolling its own. `toScreen` fades the
 * current screen out, runs `swap` at the hidden midpoint - so the swapped-in
 * screen and any side effects it triggers land together, never painted over the
 * outgoing one - then fades back in. Calling it again mid-fade restarts cleanly.
 *
 * Bind `opacity` to the faded element and give that element a matching
 * `transition: opacity {fadeMs}ms` in CSS (with `transition: none` under reduced
 * motion). The swap itself is already instant under reduced motion, so the screen
 * changes with no fade. Cleans up its pending timer on unmount.
 *
 * NOT for page/route changes - those fade fully out before navigating, handled
 * globally by the router-level page-fade interceptor in RouteCmp
 * (`useBeforeLeave` → `fadeOutCurrentPage` in ./animation).
 */
export function createScreenFade(fadeMs: number): {
  opacity: Accessor<number>;
  toScreen: (swap: () => void) => void;
} {
  const [opacity, setOpacity] = createSignal(1);
  let timer: number | undefined;

  const toScreen = (swap: () => void): void => {
    const ms = prefersReducedMotion() ? 0 : fadeMs;
    if (timer) window.clearTimeout(timer);
    setOpacity(0);
    timer = window.setTimeout(() => {
      timer = undefined;
      swap();
      setOpacity(1);
    }, ms);
  };

  onCleanup(() => {
    if (timer) window.clearTimeout(timer);
  });

  return { opacity, toScreen };
}
