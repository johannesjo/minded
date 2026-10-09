import { Accessor, createEffect, createSignal, on, onCleanup } from "solid-js";

/**
 * How long a sun↔moon flip holds the halo on the face's gentle crossfade beat.
 * Matches --dur-gentle (_variables.scss), the face layers' opacity ease.
 */
export const VARIANT_MORPH_MS = 700;

/**
 * True for one gentle beat after the sun↔moon variant flips (a resume across
 * the day/night threshold, a system theme change). The faces crossfade over
 * --dur-gentle (Sun.scss), but the halo normally eases on the quick 160ms beat
 * - so a flip swapped the warm-ringed sun halo for the moon's cool one well
 * before the face had turned: two objects for a moment instead of one turning.
 * While this holds, the halo (box-shadow + the moon's ::after pool, via the
 * `is-variant-morphing` class) rides the same gentle beat as the face.
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
 * shifts on phase changes and must keep up with the glide), the face's gentle
 * beat while a sun↔moon flip is turning the disc.
 */
export const sunHaloTransition = (isVariantMorphing: boolean): string =>
  isVariantMorphing
    ? "box-shadow var(--dur-gentle) var(--ease-out)"
    : "box-shadow 160ms ease-out";
