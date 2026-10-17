/**
 * The day↔night turn: how the sky changes over when night falls or day breaks
 * under a live page (a resume across the threshold, or the dusk/dawn minute
 * arriving while the app is open).
 *
 * It is not a crossfade. A whole-page dissolve reads as a screen changing; the
 * sky turning reads as the world doing it, so each direction moves the way the
 * real one does:
 *
 * - **Nightfall** - the dark comes down from the zenith. A soft-edged front
 *   sweeps top → bottom, so the horizon holds the last light longest, exactly
 *   where the night sky's afterglow then carries it on.
 * - **Daybreak** - the light comes up from the horizon. A soft dome of day
 *   grows from the bottom centre - the sky's own sunrise point - until it
 *   holds the whole sky.
 *
 * The sun is never part of the sweep: it stays one disc, turning sun ↔ moon on
 * its own faces (Sun.scss), timed to the moment the front passes over it
 * (`skyTurnFaceDelayMs`) - so the moon arrives with the night around it, and
 * the morning sun rises with the first light at the horizon.
 *
 * Pure geometry and timing only; the View Transition wiring that plays it lives
 * in addWrapperClasses.ts (`turnTheSky`).
 */

export type SkyTurnDirection = "nightfall" | "daybreak";

/** The whole turn: long enough to be watched, short enough never to wait on. */
export const SKY_TURN_MS = 2400;

/**
 * The sun↔moon face crossfade inside the turn. Mirrors --dur-sky-turn
 * (_variables.scss) - the face's own transition length - so the delay maths
 * below centres the very crossfade the stylesheet plays.
 */
export const SKY_TURN_FACE_MS = 1200;

/**
 * A slow, symmetric in-out: the front gathers, crosses, and settles - no
 * front-loaded snap the way the quick UI ease would have it.
 */
export const SKY_TURN_EASING = "cubic-bezier(0.45, 0, 0.55, 1)";
const EASING_POINTS = [0.45, 0, 0.55, 1] as const;

// Nightfall's mask: a vertical gradient 2.5 viewports tall - opaque (the new,
// night sky) over its top 40%, a half-viewport feathered edge, then clear.
// Sliding it down the viewport carries the soft front from just above the top
// edge to just below the bottom one.
const NIGHTFALL_MASK_HEIGHT = 2.5; // in viewport heights
const NIGHTFALL_FEATHER_FROM = 0.4; // of the mask height
const NIGHTFALL_FEATHER_TO = 0.6;

// Daybreak's dome: an ellipse centred on the bottom edge, wider than it is
// tall (DOME_ASPECT) whatever the screen's shape - a broad arc of light, never
// a tall flame on a portrait phone. It grows from nothing until its opaque
// core (DOME_CORE of the radius) covers even the far top corners, with a
// little margin, so the turn ends on the new sky everywhere - no last-frame
// cut. The feather runs from the core to the rim.
const DOME_ASPECT = 1.4; // horizontal radius / vertical radius
const DOME_CORE = 0.6; // of the ellipse's radius
const DOME_MARGIN = 1.05;

/** The dome's landed radii in px for a `width` × `height` viewport. */
const domeRadii = (width: number, height: number) => {
  // The top corners sit (width / 2, height) from the centre; solve for the
  // vertical radius that puts them on the core: (x/rx)² + (y/ry)² = core².
  const ry =
    (Math.hypot(width / 2 / DOME_ASPECT, height) / DOME_CORE) * DOME_MARGIN;
  return { rx: ry * DOME_ASPECT, ry };
};

/** One frame of the mask: its size and position (the image never changes). */
export type SkyTurnMaskFrame = { size: string; position: string };

/** The mask that reveals the *new* sky over the old one. Opaque = new sky. */
export type SkyTurnMask = {
  image: string;
  from: SkyTurnMaskFrame;
  to: SkyTurnMaskFrame;
};

/** The reveal mask for a viewport of `width` × `height` px. */
export const skyTurnMask = (
  direction: SkyTurnDirection,
  width: number,
  height: number,
): SkyTurnMask => {
  if (direction === "nightfall") {
    const size = `100% ${NIGHTFALL_MASK_HEIGHT * 100}%`;
    // A percentage position slides the tall mask through the viewport: at
    // 100% its clear tail fills the screen (all old sky), at 0% its opaque
    // head does (all new).
    return {
      image:
        `linear-gradient(to bottom, #000 ${NIGHTFALL_FEATHER_FROM * 100}%, ` +
        `transparent ${NIGHTFALL_FEATHER_TO * 100}%)`,
      from: { size, position: "0% 100%" },
      to: { size, position: "0% 0%" },
    };
  }
  const { rx, ry } = domeRadii(width, height);
  // Pixel boxes, so size and position interpolate together and the dome's
  // centre stays pinned on the bottom edge the whole way: left = (W - w) / 2,
  // top = H - h / 2, both linear in the growing size.
  const at = (w: number, h: number): SkyTurnMaskFrame => ({
    size: `${round(w)}px ${round(h)}px`,
    position: `${round((width - w) / 2)}px ${round(height - h / 2)}px`,
  });
  return {
    image:
      `radial-gradient(closest-side, #000 ${DOME_CORE * 100}%, ` +
      "transparent 100%)",
    from: at(0, 0),
    to: at(rx * 2, ry * 2),
  };
};

const round = (n: number) => Math.round(n * 10) / 10;

// How far the old sky goes ahead of the front: down toward the night (the
// light still on screen deepens as dusk does) or up toward the day (the night
// thins before the dome arrives). Gentle - the front carries the change, this
// only keeps the waiting half of the screen from standing still.
const NIGHTFALL_OLD_SKY_BRIGHTNESS = 0.8;
const DAYBREAK_OLD_SKY_BRIGHTNESS = 1.2;

/** Where the old sky's brightness ends up by the close of the turn. */
export const skyTurnOldSkyFilter = (direction: SkyTurnDirection): string =>
  `brightness(${
    direction === "nightfall"
      ? NIGHTFALL_OLD_SKY_BRIGHTNESS
      : DAYBREAK_OLD_SKY_BRIGHTNESS
  })`;

/**
 * Fired on window when a turn has fully landed (or been hurried to a close), so
 * the discs drop their slow turn beat for the everyday quick one at once rather
 * than holding it for the whole SKY_TURN_MS (sunVariantMorph.ts).
 */
export const SKY_TURN_SETTLED_EV = "minded-sky-turn-settled";

/** The class on <html> while a turn plays; the stylesheet below keys off it. */
export const SKY_TURN_CLASS = "minded-sky-turning";
/** Added with it when the runtime can mask - the sweep, not the dissolve. */
export const SKY_TURN_SWEEP_CLASS = "minded-sky-turn-sweep";

/**
 * The inline custom properties on <html> that drive the stylesheet for one
 * turn: its length and curve, the mask and the old sky's end filter. The view
 * transition's pseudo-elements inherit them from <html>.
 */
export const skyTurnVars = (
  direction: SkyTurnDirection,
  width: number,
  height: number,
): Record<string, string> => {
  const mask = skyTurnMask(direction, width, height);
  return {
    "--sky-turn-ms": `${SKY_TURN_MS}ms`,
    "--sky-turn-ease": SKY_TURN_EASING,
    "--sky-turn-mask-image": mask.image,
    "--sky-turn-mask-size-from": mask.from.size,
    "--sky-turn-mask-size-to": mask.to.size,
    "--sky-turn-mask-position-from": mask.from.position,
    "--sky-turn-mask-position-to": mask.to.position,
    "--sky-turn-old-filter": skyTurnOldSkyFilter(direction),
  };
};

/**
 * The turn as a stylesheet, injected once into the page (turnTheSky). Plain
 * CSS rather than script-driven animations: it replaces the UA's own animations
 * outright (no need for the runtime to hand them to script to be cancelled),
 * and it can carry the -webkit-mask twins, which WAAPI silently drops - the
 * WebViews that have View Transitions but only the prefixed mask need them.
 *
 * - Every capture's UA animation is off: a sun's group doesn't move (the disc
 *   stays where it is), its old snapshot is never seen, its live self shows -
 *   turning on its own faces.
 * - Sweep: the old sky stays whole and goes ahead of the front; the new one is
 *   revealed over it through the moving mask.
 * - Without masks: the old and new sky dissolve, slowed to the turn's beat.
 */
export const skyTurnStylesheet = (): string => {
  const on = `html.${SKY_TURN_CLASS}`;
  const sweep = `html.${SKY_TURN_CLASS}.${SKY_TURN_SWEEP_CLASS}`;
  const fade = `html.${SKY_TURN_CLASS}:not(.${SKY_TURN_SWEEP_CLASS})`;
  const run = (name: string) =>
    `animation: ${name} var(--sky-turn-ms) var(--sky-turn-ease) both;`;
  const mask = (prop: string, value: string) =>
    `-webkit-mask-${prop}: ${value}; mask-${prop}: ${value};`;
  return [
    `${on}::view-transition-group(*) { animation: none; }`,
    `${on}::view-transition-old(*) { animation: none; opacity: 0; }`,
    `${on}::view-transition-new(*) { animation: none; opacity: 1; mix-blend-mode: normal; }`,
    `${sweep}::view-transition-old(root) { opacity: 1; mix-blend-mode: normal; ${run("minded-sky-turn-old")} }`,
    `${sweep}::view-transition-new(root) { ${mask("image", "var(--sky-turn-mask-image)")} ${mask("repeat", "no-repeat")} ${run("minded-sky-turn-reveal")} }`,
    `${fade}::view-transition-old(root) { mix-blend-mode: plus-lighter; ${run("minded-sky-turn-fade-out")} }`,
    `${fade}::view-transition-new(root) { mix-blend-mode: plus-lighter; ${run("minded-sky-turn-fade-in")} }`,
    "@keyframes minded-sky-turn-reveal {" +
      ` from { ${mask("size", "var(--sky-turn-mask-size-from)")} ${mask("position", "var(--sky-turn-mask-position-from)")} }` +
      ` to { ${mask("size", "var(--sky-turn-mask-size-to)")} ${mask("position", "var(--sky-turn-mask-position-to)")} } }`,
    "@keyframes minded-sky-turn-old { from { filter: brightness(1); } to { filter: var(--sky-turn-old-filter); } }",
    "@keyframes minded-sky-turn-fade-out { from { opacity: 1; } to { opacity: 0; } }",
    "@keyframes minded-sky-turn-fade-in { from { opacity: 0; } to { opacity: 1; } }",
  ].join("\n");
};

/**
 * How far through the turn (0..1 of its eased progress) the front reaches a
 * point at `yFraction` of a `width` × `height` viewport (0 top, 1 bottom).
 */
export const skyTurnFrontReach = (
  direction: SkyTurnDirection,
  yFraction: number,
  width: number,
  height: number,
): number => {
  const y = clamp01(yFraction);
  if (direction === "nightfall") {
    // In viewport heights: the feather's midpoint sits `mid` below the mask's
    // top edge, and the mask slides down by `travel` - so the front runs from
    // -0.25 (just above the top) to 1.25 (just below the bottom).
    const mid =
      ((NIGHTFALL_FEATHER_FROM + NIGHTFALL_FEATHER_TO) / 2) *
      NIGHTFALL_MASK_HEIGHT;
    const travel = NIGHTFALL_MASK_HEIGHT - 1;
    return clamp01((y - (mid - travel)) / travel);
  }
  // The dome's front - midway through its feather - climbs straight up from
  // the bottom edge as the dome grows.
  const frontRadius = ((DOME_CORE + 1) / 2) * domeRadii(width, height).ry;
  return clamp01(((1 - y) * height) / frontRadius);
};

/**
 * When the disc's own sun↔moon crossfade should start so it is centred on the
 * front passing over it: a companion resting on the bottom bar turns late at
 * nightfall (the night reaches the horizon last) and early at daybreak (the
 * light starts there), an intervention sun mid-screen turns mid-turn. Kept
 * inside the turn so the face always lands with the sky.
 */
export const skyTurnFaceDelayMs = (
  direction: SkyTurnDirection,
  yFraction: number,
  width: number,
  height: number,
): number => {
  const at =
    timeForEasedProgress(
      skyTurnFrontReach(direction, yFraction, width, height),
    ) * SKY_TURN_MS;
  const delay = at - SKY_TURN_FACE_MS / 2;
  return Math.round(
    Math.min(Math.max(delay, 0), SKY_TURN_MS - SKY_TURN_FACE_MS),
  );
};

/** The direction of a flip into `isDark`. */
export const skyTurnDirectionFor = (isDark: boolean): SkyTurnDirection =>
  isDark ? "nightfall" : "daybreak";

/**
 * The inverse of SKY_TURN_EASING: the time fraction (0..1) at which the eased
 * progress reaches `progress`. The masks move on eased progress, the face's
 * delay is wall-clock time, so the delay has to go back through the curve.
 */
export const timeForEasedProgress = (progress: number): number => {
  const [x1, y1, x2, y2] = EASING_POINTS;
  const bezier = (a: number, b: number, s: number) =>
    3 * a * s * (1 - s) ** 2 + 3 * b * s ** 2 * (1 - s) + s ** 3;
  const target = clamp01(progress);
  // y(s) is monotonic for this curve, so bisection on s is exact enough.
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (bezier(y1, y2, mid) < target) lo = mid;
    else hi = mid;
  }
  return bezier(x1, x2, (lo + hi) / 2);
};

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);
