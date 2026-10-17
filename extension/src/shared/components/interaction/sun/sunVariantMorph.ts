import { Accessor, createEffect, createSignal, on, onCleanup } from "solid-js";
import { SKY_TURN_MS } from "@src/shared/sky/skyTurn";

/**
 * How long a sun↔moon flip holds the halo on the face's turn. The whole sky
 * turn, not just the face's --dur-sky-turn: the face may wait for the sky's
 * front (--sky-turn-delay) before it starts, and the halo has to keep the slow
 * beat until it lands.
 */
export const VARIANT_MORPH_MS = SKY_TURN_MS;

/**
 * True for the length of a sky turn after the sun↔moon variant flips (a resume across
 * the day/night threshold, a system theme change). The faces crossfade over
 * --dur-gentle (Sun.scss), but the halo normally eases on the quick 160ms beat
 * - so a flip swapped the warm-ringed sun halo for the moon's cool one well
 * before the face had turned: two objects for a moment instead of one turning.
 * While this holds, the halo (box-shadow + the moon's ::after pool, via the
 * `is-variant-morphing` class) rides the same beat and delay as the face.
 * The initial variant is not a flip, so mounting never starts a morph.
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
  onCleanup(() => window.clearTimeout(timer));
  return getIsMorphing;
};

/**
 * The disc's box-shadow transition: the quick bloom ease normally (the glow
 * shifts on phase changes and must keep up with the glide), the face's own
 * turn - same beat, same wait for the sky's front - while a sun↔moon flip is
 * turning the disc.
 */
export const sunHaloTransition = (isVariantMorphing: boolean): string =>
  isVariantMorphing
    ? "box-shadow var(--dur-sky-turn) var(--ease-sky-turn) var(--sky-turn-delay, 0ms)"
    : "box-shadow 160ms ease-out";
