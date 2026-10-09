import type { SunSettle } from "./Sun";
import { GLOW_COOL_RGB, GLOW_WHITE_RGB } from "./sunAnimationUtils";

/**
 * THE SUN AS A LIGHT SOURCE - the soft lift of the sky around the disc.
 *
 * The halo (Sun.scss box-shadow) is the light *at* the sun. This is the light
 * it casts *onto the sky*: a broad, faint radial lift centred on the disc, so
 * the sky around the sun reads brighter than the sky far from it.
 *
 * Where it lives, and why: it is a child layer of the disc itself
 * (`.sun-light` in Sun.tsx), so it rides the disc's own transform. Every move
 * the sun makes - drag, fling, snap-back, settle glide, the companion →
 * intervention lift, the corner hand-offs, the reflow re-pins - carries its
 * light with it on the very same frame, in every runtime (shell, content
 * script, Android/iOS WebViews, sleep wind-down), with no position mirroring
 * to drift. "One continuous sun" then holds physically, not only
 * geometrically: the light can't lag, lead, or be in two places.
 *
 * Consequences of that choice, all deliberate:
 * - It only ever moves when the disc moves. No ambient drift, no pulse, no
 *   breath of its own (the disc's guided breath scales it along, which is the
 *   disc breathing, not the light).
 * - It shares the disc's opacity and scale: a fling fades it with the disc; the
 *   small companion casts a smaller pool than the full intervention sun.
 * - It is its own compositor layer (`will-change: opacity`), rasterised once.
 *   Moving it is a compositor transform of the parent, and the per-frame
 *   box-shadow repaint the drag glow already causes never re-rasterises it.
 *
 * THE HALO RULE applies unchanged: the light the sun casts is white. It
 * ignores `settle.warmth` entirely - the departing hand-off warms the *halo* as
 * it becomes the Little Sun, but its sky light simply fades with the sky it
 * fell on (see sunLightLevel). Nothing here is ever amber. The moon casts a
 * cooler, much fainter pool.
 */

/** Pool diameter, in disc diameters. Broad enough to read as sky, not halo. */
export const SUN_LIGHT_SPREAD = 5;

/**
 * The pool's colour as an `"r, g, b"` triple. White for the sun on every
 * surface; the moon's cool tint is the cool end of the shared glow axis, so
 * the moonlight and the moon's halo are the same cool. Deliberately takes no
 * warmth input - there is no state in which the cast light warms.
 */
export const sunLightRgb = (variant: "sun" | "moon" | undefined): string =>
  (variant === "moon" ? GLOW_COOL_RGB : GLOW_WHITE_RGB).join(", ");

/**
 * The moon's pool relative to the sun's (multiplies the same gradient, tinted
 * cool). The pale day sky has almost no headroom for a white lift, so the same
 * alpha reads several times stronger on the deep night sky - half the level
 * there already lands as a much fainter light than the sun's, and it washes
 * out the nearest stars the way real moonlight does. It still earns its
 * place: without it the moon would be the only disc that doesn't light its
 * sky, and a theme flip mid-flight would cut the light out instead of easing
 * it down with the sun → moon face crossfade.
 */
export const MOON_LIGHT_LEVEL = 0.5;

/**
 * How strongly the pool shows for this disc + settle (0..1, applied as the
 * layer's opacity and eased by CSS - never per frame).
 *
 * Zero on the corner hand-offs (the only settles that pin `discPx`): there the
 * sky the light falls on is itself dissolving to reveal someone else's app
 * (departing) or fading back in (arriving), and a white pool over arbitrary
 * content would just be a pale smudge. So the light leaves with the sky and
 * comes home with it, on the sky's own --dur-sky beat.
 */
export const sunLightLevel = (
  variant: "sun" | "moon" | undefined,
  settle: SunSettle | null | undefined,
): number => {
  if (settle?.discPx != null) return 0;
  return variant === "moon" ? MOON_LIGHT_LEVEL : 1;
};

/**
 * The pool's box relative to the disc: a centred square SUN_LIGHT_SPREAD disc
 * diameters wide, expressed as a percentage inset so it tracks the disc's size
 * at every breakpoint with no measuring. Negative = extends past the disc.
 */
export const sunLightInsetPct = (spread: number = SUN_LIGHT_SPREAD): number =>
  -((spread - 1) / 2) * 100;

/**
 * The pool's own fade (its opacity, when the level above changes). It rides
 * the sky's --dur-sky beat so the light leaves and returns with the sky it
 * falls on. Under reduced motion it doesn't fade at all - the light simply sits
 * where the (equally snapped) disc rests. Travel needs no rule here: the pool
 * is the disc's child, so it moves exactly as the disc does and no further.
 */
export const sunLightTransition = (reducedMotion: boolean): string =>
  reducedMotion ? "none" : "opacity var(--dur-sky) var(--ease-out)";

/**
 * The pool's inline style, read reactively by Sun.tsx. Depends only on the
 * variant, the settle and the motion preference - all of which change on a
 * role or theme switch, never per frame - so a drag never touches it.
 */
export const sunLightStyle = (
  variant: "sun" | "moon" | undefined,
  settle: SunSettle | null | undefined,
  reducedMotion: boolean,
): Record<string, string> => ({
  inset: `${sunLightInsetPct()}%`,
  "--sun-light-rgb": sunLightRgb(variant),
  opacity: `${sunLightLevel(variant, settle)}`,
  transition: sunLightTransition(reducedMotion),
});
