import type { MoonPhase } from "./lunarPhase";

/**
 * The night side of the moon disc, as a CSS background layer for
 * `.moon-face::after` (Sun.scss, via `--moon-shadow`).
 *
 * The lit part of the moon is bounded by its limb on one side and the
 * terminator - a half-ellipse whose width is |cos| of the phase angle - on the
 * other. So the shadow is "everything on the dark side of that half-ellipse",
 * which one SVG path draws for every phase: a crescent's terminator bulges
 * into the lit half, a gibbous one away from it. A gaussian blur softens the
 * terminator the way the real one is soft (sunlight grazing the limb) - never
 * a cut-out edge.
 *
 * The shadow is not black. It is the earthshine - sunlight bounced off Earth
 * onto the moon's night side - a dim cool wash that leaves the dark limb and
 * its maria faintly readable. That keeps the companion a recognisable,
 * tappable moon even at new moon, where a true-to-life sky would show nothing
 * at all. Only the disc's face changes; the halo is untouched (the moon still
 * never warms - docs/sun-halo.md).
 *
 * Seen from the southern hemisphere the moon is flipped left-right: it waxes
 * from the left there.
 */

/** The earthshine: the dark side's colour and how much of the face it veils. */
const EARTHSHINE_FILL = "%23141e3d"; // #141e3d, URL-escaped
const EARTHSHINE_OPACITY = 0.7;
/**
 * How far past the lit limb the light may reach before the blur, at most. The
 * lit side's clear area is a lune that hugs the limb and is no wider than the
 * crescent itself, so it pinches shut at both poles and vanishes at new moon.
 */
const LIMB_MARGIN = 20;
/** Above this lit fraction the shadow is a hairline: draw a plain full moon. */
const FULL_MOON_ILLUMINATION = 0.99;

const round = (v: number): number => Math.round(v * 10) / 10;

/** A CSS background value for the moon's night side, or `none` at full. */
export const moonShadowLayerFor = (
  phase: MoonPhase,
  isSouthernHemisphere = false,
): string => {
  if (phase.illumination >= FULL_MOON_ILLUMINATION) return "none";
  // Drawn lit-on-the-right (waxing, as seen from the north), shadow on the
  // left of the terminator; mirrored for the other three cases.
  const c = Math.cos(2 * Math.PI * phase.cycle); // 1 new … -1 full
  const rx = round(50 * Math.abs(c));
  // From the disc's bottom pole back up to its top: sweep 0 bulges right
  // (crescent - the shadow takes more than half), 1 bulges left (gibbous).
  const sweep = c > 0 ? 0 : 1;
  const mirror = phase.isWaxing === isSouthernHemisphere;
  // Everything is shadow except the lit lune: out from the top pole past the
  // limb, then back up the terminator. The blur takes in what lies just past
  // the limb, so that margin must shrink with the crescent - a clear band out
  // there of fixed width lit the rim of a new moon's lit-side half and left a
  // hard step against the dark half at each pole.
  const litWidth = 50 * (1 - c);
  const rLimb = round(50 + Math.min(LIMB_MARGIN, 2 * litWidth));
  const path =
    `M-20,-20 H120 V120 H-20 Z ` +
    `M50,0 A${rLimb},50 0 0 1 50,100 A${rx},50 0 0 ${sweep} 50,0 Z`;
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" +
    "<filter id='s' x='-50%25' y='-50%25' width='200%25' height='200%25'>" +
    "<feGaussianBlur stdDeviation='3'/></filter>" +
    `<path d='${path}' fill-rule='evenodd' fill='${EARTHSHINE_FILL}' opacity='${EARTHSHINE_OPACITY}' filter='url(%23s)'` +
    (mirror ? " transform='matrix(-1 0 0 1 100 0)'" : "") +
    "/></svg>";
  return `url("data:image/svg+xml;utf8,${svg}")`;
};
