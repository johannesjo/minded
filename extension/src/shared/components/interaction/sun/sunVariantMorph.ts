import {
  Accessor,
  createEffect,
  createSignal,
  on,
  onCleanup,
  onMount,
} from "solid-js";
import { SKY_TURN_MS, SKY_TURN_SETTLED_EV } from "@src/shared/sky/skyTurn";

/**
 * The longest a sun↔moon flip holds the halo on the face's turn: the whole sky
 * turn, not just the face's --dur-sky-turn, since the face may wait for the
 * sky's front (--sky-turn-delay) before it starts. Normally the turn ends it
 * sooner - SKY_TURN_SETTLED_EV, the moment the sky has landed or been hurried
 * to a close - so a tap that cut the turn short doesn't leave the next glide
 * dragging a slow halo.
 */
export const VARIANT_MORPH_MS = SKY_TURN_MS;

/**
 * True while a sun↔moon variant flip is turning the disc (a resume across the
 * day/night threshold, the live dusk/dawn turn). The faces crossfade over
 * --dur-sky-turn (Sun.scss), but the halo normally eases on the quick 160ms
 * beat - so a flip swapped the warm-ringed sun halo for the moon's cool one
 * well before the face had turned: two objects for a moment instead of one
 * turning. While this holds, the halo (box-shadow + the moon's ::after pool +
 * the light on the sky + the warm rim, via the `is-variant-morphing` class)
 * rides the same beat and delay as the face. The initial variant is not a
 * flip, so mounting never starts a morph.
 */
export const createVariantMorph = (
  getVariant: () => "sun" | "moon" | undefined,
): Accessor<boolean> => {
  const [getIsMorphing, setIsMorphing] = createSignal(false);
  let timer: number | undefined;
  createEffect(
    on(
      getVariant,
      () => {
        setIsMorphing(true);
        window.clearTimeout(timer);
        timer = window.setTimeout(() => setIsMorphing(false), VARIANT_MORPH_MS);
      },
      { defer: true },
    ),
  );
  const settle = () => {
    window.clearTimeout(timer);
    setIsMorphing(false);
  };
  // In onMount, like the effect above: neither runs in a server render.
  onMount(() => {
    window.addEventListener(SKY_TURN_SETTLED_EV, settle);
    onCleanup(() => window.removeEventListener(SKY_TURN_SETTLED_EV, settle));
  });
  onCleanup(() => window.clearTimeout(timer));
  return getIsMorphing;
};

/**
 * The disc's box-shadow transition: the face's own turn - same beat, same wait
 * for the sky's front - while a sun↔moon flip is turning the disc; across a
 * settle glide, the glide's own duration and in-out curve (--ease-sky-turn is
 * the CSS twin of easeInOut), so the halo's new shape and colour land *with*
 * the position - the departing amber arrives as the sun reaches the corner, not
 * in the first instant of take-off over our still-visible sky; otherwise the
 * quick bloom ease (the glow shifts on hover and phase changes).
 */
export const sunHaloTransition = (
  isVariantMorphing: boolean,
  settleGlideMs?: number | null,
): string =>
  isVariantMorphing
    ? "box-shadow var(--dur-sky-turn) var(--ease-sky-turn) var(--sky-turn-delay, 0ms)"
    : settleGlideMs
      ? `box-shadow ${settleGlideMs}ms var(--ease-sky-turn)`
      : "box-shadow 160ms ease-out";
