/**
 * The living time-of-day sky (issue #123).
 *
 * One timeline drives every sky surface. The ambient app background quietly
 * tracks the local hour through pastel keyframes, and the sun-drag reveals
 * (down → sunset/dusk, up → zenith blue) are targets on the *same* timeline —
 * so the gesture reads as leaning away from "now" toward evening or toward
 * the zenith, and releasing springs back to the present, instead of jumping
 * to a fixed postcard sky that may contradict the actual time of day.
 *
 * Night (19:00–06:00) stays owned by the dark theme's two-orb background in
 * _variables.scss; this module only shapes the light window. Guardrail from
 * the issue: this is slow ambient *state*, not animation — values step per
 * minute (see applySkyForNow), nothing drifts visibly.
 *
 * All values are pure data/functions; DOM application lives in
 * addWrapperClasses.ts.
 */

/** Top-to-horizon color stops, matching --c-gradient-1..4 in _variables.scss. */
export type SkyColors = [string, string, string, string];

// Shared day/night boundary (also drives the dark-mode class in
// addWrapperClasses.ts). Set NIGHT_START_HOUR low (e.g. 11) to preview night
// during the day.
export const NIGHT_START_HOUR = 19;
export const NIGHT_END_HOUR = 6;

/**
 * Ambient pastel keyframes across the light window. These are the *resting*
 * app background, so they must stay light enough for the light theme's dark
 * text at every hour — the saturated skies live in the drag targets below.
 * The 9:00 "morning" keyframe is the classic static sky from _variables.scss
 * (pinned by a test) so the long-standing brand look is the timeline's anchor.
 */
export const AMBIENT_SKY_KEYFRAMES: ReadonlyArray<{
  hour: number;
  label: string;
  colors: SkyColors;
}> = [
  {
    hour: 6,
    label: "dawn",
    colors: ["#c9d3ea", "#dde5e4", "#f3e6cf", "#f5cfc3"],
  },
  {
    hour: 9,
    label: "morning",
    colors: ["#cfe4f5", "#d8ecd6", "#f5efc8", "#f6dcd2"],
  },
  {
    hour: 13,
    label: "midday",
    colors: ["#c5e0f7", "#d6eee3", "#eff2d6", "#f6e8d6"],
  },
  {
    hour: 16.5,
    label: "afternoon",
    colors: ["#cfdff0", "#dfead8", "#f6ecc8", "#f7d9c9"],
  },
  {
    hour: 19,
    label: "dusk",
    colors: ["#c0c8e6", "#e0d2d6", "#f6dcb8", "#f1c0ab"],
  },
];

/**
 * From this hour the drag targets start deepening toward night: the ambient
 * sky is already warming toward dusk, so a fixed sunset target would lose its
 * reveal payoff exactly at golden hour (and a fixed midday blue would read as
 * a time machine). This is the timeline's minimum-contrast floor.
 */
export const DUSK_BLEND_START_HOUR = 17;

// Drag-down reveal (grounding). The classic values mirror the light-mode
// --bg-transition-sunset-* tokens in _variables.scss.
const CLASSIC_SUNSET: SkyColors = ["#4f78bb", "#f49f73", "#ffd36a", "#ef6f63"];
const DEEP_DUSK: SkyColors = ["#2b3f70", "#b0687a", "#e69a55", "#a94f57"];

// Drag-up reveal (zenith). Classic values mirror --bg-transition-bluesky-*.
const CLASSIC_ZENITH: [string, string] = ["#0058c1", "#0a75bc"];
const EVENING_ZENITH: [string, string] = ["#16305f", "#2a4f7d"];

const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

const lerpHex = (a: string, b: string, t: number): string => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  let out = "#";
  for (const shift of [16, 8, 0]) {
    const ca = (pa >> shift) & 0xff;
    const cb = (pb >> shift) & 0xff;
    out += Math.round(ca + (cb - ca) * t)
      .toString(16)
      .padStart(2, "0");
  }
  return out;
};

const lerpColors = <T extends string[]>(a: T, b: T, t: number): T =>
  a.map((c, i) => lerpHex(c, b[i], t)) as T;

/**
 * Ambient sky colors at a fractional local hour, piecewise-linear between
 * keyframes. Hours outside the light window clamp to its edges: the dark
 * theme owns the real night sky, and the only light-mode caller outside the
 * window is a stale tab whose theme was decided at load — holding the dusk
 * (or dawn) edge is the honest sky for it.
 */
export const ambientSkyColorsAt = (hour: number): SkyColors => {
  const kfs = AMBIENT_SKY_KEYFRAMES;
  const h = clamp(hour, kfs[0].hour, kfs[kfs.length - 1].hour);
  for (let i = 1; i < kfs.length; i++) {
    if (h <= kfs[i].hour) {
      const t = (h - kfs[i - 1].hour) / (kfs[i].hour - kfs[i - 1].hour);
      return lerpColors(kfs[i - 1].colors, kfs[i].colors, t);
    }
  }
  return kfs[kfs.length - 1].colors;
};

/** 0 before the dusk blend starts, 1 at the night boundary. */
const duskBlendT = (hour: number): number =>
  clamp(
    (hour - DUSK_BLEND_START_HOUR) / (NIGHT_START_HOUR - DUSK_BLEND_START_HOUR),
    0,
    1,
  );

/** Drag-down target colors: classic sunset by day, deepening toward night. */
export const duskTargetColorsAt = (hour: number): SkyColors =>
  lerpColors(CLASSIC_SUNSET, DEEP_DUSK, duskBlendT(hour));

/** Drag-up target colors: classic zenith blue by day, dimming toward evening. */
export const zenithTargetColorsAt = (hour: number): [string, string] =>
  lerpColors(CLASSIC_ZENITH, EVENING_ZENITH, duskBlendT(hour));

/**
 * Gradient builders. Stop positions mirror the composed gradients in
 * _variables.scss (--background-gradient / --background-sunset-gradient) and
 * BackgroundTransition.scss (.background-blue) — keep them in sync so an
 * inline override is pixel-compatible with the stylesheet default.
 */
export const ambientSkyGradient = (c: SkyColors): string =>
  `linear-gradient(to bottom, ${c[0]} 0%, ${c[0]} 18%, ${c[1]} 36%, ${c[2]} 54%, ${c[3]} 100%)`;

export const duskTargetGradientAt = (hour: number): string => {
  const c = duskTargetColorsAt(hour);
  return `linear-gradient(to bottom, ${c[0]} 0%, ${c[0]} 14%, ${c[1]} 54%, ${c[2]} 78%, ${c[3]} 100%)`;
};

export const zenithTargetGradientAt = (hour: number): string => {
  const [top, bottom] = zenithTargetColorsAt(hour);
  return `linear-gradient(to bottom, ${top}, ${bottom})`;
};

/**
 * Parse the `?skyHour=` dev override (styleguide / dashboard simulation),
 * mirroring the `?theme=` pattern in addWrapperClasses.ts. Accepts a
 * fractional hour ("17.5") or "HH:MM" ("17:30"); null if absent or invalid.
 */
export const parseSkyHourParam = (search: string): number | null => {
  const raw = new URLSearchParams(search).get("skyHour");
  if (!raw) return null;
  let hour: number;
  if (raw.includes(":")) {
    const [h, m] = raw.split(":");
    const mins = Number(m);
    if (h === "" || m === "" || !(mins >= 0 && mins < 60)) return null;
    hour = Number(h) + mins / 60;
  } else {
    hour = Number(raw);
  }
  return Number.isFinite(hour) && hour >= 0 && hour < 24 ? hour : null;
};
