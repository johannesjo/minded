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

/**
 * The two accent tints of the layered day sky (issue: "day skies should be as
 * beautiful as night"). The night sky earns its depth from layers — a warm
 * horizon glow over a star field over the deep gradient — so the day sky gets
 * the same build: a light bloom pooling at the horizon, a static cirrus veil
 * (the day's stars — see --day-veil in _variables.scss), and a gently deeper
 * zenith dome up top. These are the per-hour tints of the two gradient layers;
 * their fixed alphas and ellipse geometry live in _variables.scss.
 */
export type SkyAccents = { zenith: string; horizonGlow: string };

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
  accents: SkyAccents;
}> = [
  {
    hour: 6,
    label: "dawn",
    colors: ["#c9d3ea", "#dde5e4", "#f3e6cf", "#f5cfc3"],
    accents: { zenith: "#a8b4d8", horizonGlow: "#f7c3a8" },
  },
  {
    hour: 9,
    label: "morning",
    colors: ["#cfe4f5", "#d8ecd6", "#f5efc8", "#f6dcd2"],
    accents: { zenith: "#b0d0ec", horizonGlow: "#fff0cd" },
  },
  {
    hour: 13,
    label: "midday",
    colors: ["#c5e0f7", "#d6eee3", "#eff2d6", "#f6e8d6"],
    accents: { zenith: "#a6cbef", horizonGlow: "#fffbee" },
  },
  {
    hour: 16.5,
    label: "afternoon",
    colors: ["#cfdff0", "#dfead8", "#f6ecc8", "#f7d9c9"],
    accents: { zenith: "#b0c6e2", horizonGlow: "#ffe6b8" },
  },
  {
    hour: 19,
    label: "dusk",
    colors: ["#c0c8e6", "#e0d2d6", "#f6dcb8", "#f1c0ab"],
    accents: { zenith: "#98a5cd", horizonGlow: "#f6bd96" },
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
 * Piecewise-linear lerp across the ambient keyframes. Hours outside the light
 * window clamp to its edges: the dark theme owns the real night sky, and the
 * only light-mode caller outside the window is a stale tab whose theme was
 * decided at load — holding the dusk (or dawn) edge is the honest sky for it.
 */
const ambientKeyframeLerp = <T extends string[]>(
  hour: number,
  pick: (kf: (typeof AMBIENT_SKY_KEYFRAMES)[number]) => T,
): T => {
  const kfs = AMBIENT_SKY_KEYFRAMES;
  const h = clamp(hour, kfs[0].hour, kfs[kfs.length - 1].hour);
  for (let i = 1; i < kfs.length; i++) {
    if (h <= kfs[i].hour) {
      const t = (h - kfs[i - 1].hour) / (kfs[i].hour - kfs[i - 1].hour);
      return lerpColors(pick(kfs[i - 1]), pick(kfs[i]), t);
    }
  }
  return pick(kfs[kfs.length - 1]);
};

/** Ambient sky colors at a fractional local hour (see ambientKeyframeLerp). */
export const ambientSkyColorsAt = (hour: number): SkyColors =>
  ambientKeyframeLerp(hour, (kf) => kf.colors);

/** The layered day sky's accent tints at a fractional local hour. */
export const ambientSkyAccentsAt = (hour: number): SkyAccents => {
  const [zenith, horizonGlow] = ambientKeyframeLerp(hour, (kf) => [
    kf.accents.zenith,
    kf.accents.horizonGlow,
  ]);
  return { zenith, horizonGlow };
};

/**
 * "#rrggbb" → "r, g, b" for the `--*-rgb` custom-property idiom
 * (_variables.scss wraps these in rgba() at fixed alphas, the same way
 * --horizon-reflection-rgb works for the night companion's glow).
 */
export const hexToRgbChannels = (hex: string): string => {
  const p = parseInt(hex.slice(1), 16);
  return `${(p >> 16) & 0xff}, ${(p >> 8) & 0xff}, ${p & 0xff}`;
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

/**
 * The full layered ambient day sky as a CSS background value — horizon bloom
 * over cirrus veil over zenith dome over the pastel base. Mirrors the light
 * theme's composed --background-gradient in _variables.scss (which builds the
 * same layers from the --day-*-rgb vars) — keep geometry and alphas in sync.
 * The veil is referenced as var(--day-veil) so the SVG in _variables.scss
 * stays the only copy; callers must render inside the app root. Used by the
 * styleguide's sky strips so previews show the sky that actually ships.
 */
export const ambientSkyLayeredBackground = (
  colors: SkyColors,
  accents: SkyAccents,
): string => {
  const glow = hexToRgbChannels(accents.horizonGlow);
  const zenith = hexToRgbChannels(accents.zenith);
  return [
    `radial-gradient(ellipse 90% 32% at 50% 108%, rgba(${glow}, 0.65) 0%, rgba(${glow}, 0.3) 48%, transparent 78%)`,
    "var(--day-veil)",
    `radial-gradient(ellipse 130% 52% at 50% -14%, rgba(${zenith}, 0.55) 0%, rgba(${zenith}, 0.22) 55%, transparent 80%)`,
    ambientSkyGradient(colors),
  ].join(", ");
};

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
