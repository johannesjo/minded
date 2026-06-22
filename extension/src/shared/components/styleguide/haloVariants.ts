// Halo studies for the sun & moon — 12 each, to compare side by side and over
// the live page gradient (see StyleguideHalos.tsx). Each recipe is expressed
// purely as CSS-variable values so the disc markup stays one component and a
// winner can be ported into Sun.scss by copying these three strings.
//
//   --halo-disc   the disc face (radial gradient or solid)
//   --halo-shadow the rim halo — layered box-shadow "rings" around the disc
//   --halo-wash   the broad bloom the light casts behind the disc; "none" for
//                 the moon (the night scene stays cool, no warm wash)
//
// Values are eyeballed starting points, deliberately spread across tightness,
// reach, hue and intensity so the differences are easy to read. The disc face
// is held constant per type so the comparison isolates the halo, not the face.

export type HaloType = "sun" | "moon";

export interface HaloVariant {
  key: string;
  label: string;
  note: string;
  /** `--halo-disc` */
  disc: string;
  /** `--halo-shadow` */
  halo: string;
  /** `--halo-wash` */
  wash: string;
}

// Disc faces, constant per type (mirrors Sun.scss: white sun, cool-gradient moon).
const SUN_FACE = "#fff";
const MOON_FACE =
  "radial-gradient(circle at 34% 30%, #ffffff 0 18%, #dfe8ff 58%, #a9b8dc 100%)";

const sun = (
  key: string,
  label: string,
  note: string,
  halo: string,
  wash: string,
): HaloVariant => ({
  key: `sun-${key}`,
  label,
  note,
  disc: SUN_FACE,
  halo,
  wash,
});

const moon = (
  key: string,
  label: string,
  note: string,
  halo: string,
): HaloVariant => ({
  key: `moon-${key}`,
  label,
  note,
  disc: MOON_FACE,
  halo,
  wash: "none",
});

export const SUN_VARIANTS: HaloVariant[] = [
  sun(
    "classic",
    "Classic",
    "Today's sun — pale-gold core, warm mid, faint wide outer.",
    "0 0 16px 1px rgba(255,243,214,0.36), 0 0 40px 6px rgba(255,222,158,0.2), 0 0 76px 12px rgba(255,202,124,0.11)",
    "radial-gradient(circle, rgba(255,239,170,0) 17%, rgba(255,239,170,0.34) 27%, rgba(250,205,105,0.14) 41%, rgba(250,205,105,0) 62%)",
  ),
  sun(
    "tight-corona",
    "Tight corona",
    "Small, bright, concentrated — a crisp sun on a clear day.",
    "0 0 10px 1px rgba(255,247,222,0.5), 0 0 22px 3px rgba(255,224,150,0.28), 0 0 40px 6px rgba(255,206,128,0.12)",
    "radial-gradient(circle, rgba(255,242,180,0) 16%, rgba(255,240,175,0.4) 24%, rgba(252,210,120,0.16) 34%, rgba(252,210,120,0) 50%)",
  ),
  sun(
    "wide-bloom",
    "Wide bloom",
    "Large, soft, faint — light spreading far across the sky.",
    "0 0 30px 4px rgba(255,238,196,0.26), 0 0 70px 14px rgba(255,214,150,0.14), 0 0 120px 26px rgba(255,200,130,0.08)",
    "radial-gradient(circle, rgba(255,238,170,0) 14%, rgba(255,238,170,0.26) 26%, rgba(250,205,110,0.12) 46%, rgba(250,205,110,0) 74%)",
  ),
  sun(
    "golden-hour",
    "Golden hour",
    "Saturated amber — the low, warm light before dusk.",
    "0 0 18px 2px rgba(255,214,130,0.45), 0 0 52px 10px rgba(255,170,80,0.22), 0 0 96px 18px rgba(245,140,70,0.1)",
    "radial-gradient(circle, rgba(255,224,150,0) 16%, rgba(255,216,130,0.36) 27%, rgba(252,180,90,0.16) 44%, rgba(252,180,90,0) 66%)",
  ),
  sun(
    "sunset-fade",
    "Sunset fade",
    "Gold core fading to coral at the edge — a hue shift outward.",
    "0 0 16px 1px rgba(255,240,200,0.4), 0 0 46px 8px rgba(255,180,110,0.22), 0 0 88px 16px rgba(239,120,95,0.12)",
    "radial-gradient(circle, rgba(255,240,200,0) 16%, rgba(255,224,160,0.32) 27%, rgba(248,150,110,0.16) 46%, rgba(239,120,95,0) 70%)",
  ),
  sun(
    "pale-whisper",
    "Pale whisper",
    "Barely there — near-white, minimal, lets the sky read through.",
    "0 0 14px 1px rgba(255,250,235,0.3), 0 0 44px 8px rgba(255,236,200,0.12)",
    "radial-gradient(circle, rgba(255,248,225,0) 16%, rgba(255,246,220,0.2) 28%, rgba(255,232,180,0.08) 46%, rgba(255,232,180,0) 66%)",
  ),
  sun(
    "double-ring",
    "Double ring",
    "A bright inner ring, then a separated soft outer band.",
    "0 0 9px 0 rgba(255,246,216,0.5), 0 0 18px 8px rgba(255,232,170,0.14), 0 0 60px 14px rgba(255,206,130,0.16)",
    "radial-gradient(circle, rgba(255,240,180,0) 18%, rgba(255,238,175,0.3) 26%, rgba(252,206,120,0.12) 42%, rgba(252,206,120,0) 64%)",
  ),
  sun(
    "warm-fog",
    "Warm fog",
    "No defined rings — pure diffuse haze, like sun through mist.",
    "0 0 60px 24px rgba(255,224,160,0.16), 0 0 110px 50px rgba(255,210,140,0.07)",
    "radial-gradient(circle, rgba(255,232,165,0) 12%, rgba(255,230,165,0.2) 30%, rgba(252,210,140,0.12) 52%, rgba(252,210,140,0) 80%)",
  ),
  sun(
    "ember",
    "Ember",
    "Deep and reddish — a dimmer, hotter, end-of-day glow.",
    "0 0 16px 1px rgba(255,226,170,0.4), 0 0 48px 8px rgba(248,150,90,0.22), 0 0 92px 16px rgba(214,96,72,0.12)",
    "radial-gradient(circle, rgba(255,224,170,0) 16%, rgba(252,180,120,0.32) 28%, rgba(216,100,76,0.16) 48%, rgba(216,100,76,0) 72%)",
  ),
  sun(
    "crisp-daylight",
    "Crisp daylight",
    "Bright tight core, clean mid — high-clarity midday sun.",
    "0 0 12px 0 rgba(255,252,240,0.55), 0 0 34px 4px rgba(255,228,160,0.26), 0 0 70px 10px rgba(255,206,128,0.1)",
    "radial-gradient(circle, rgba(255,250,230,0) 16%, rgba(255,242,190,0.34) 26%, rgba(255,210,130,0.14) 42%, rgba(255,210,130,0) 64%)",
  ),
  sun(
    "aura",
    "Aura",
    "Bold and present — strong, high-opacity, large breathing halo.",
    "0 0 22px 2px rgba(255,240,200,0.5), 0 0 60px 12px rgba(255,200,120,0.3), 0 0 110px 22px rgba(255,180,110,0.14)",
    "radial-gradient(circle, rgba(255,238,185,0) 15%, rgba(255,230,165,0.42) 27%, rgba(255,195,115,0.2) 46%, rgba(255,185,110,0) 72%)",
  ),
  sun(
    "honey",
    "Honey",
    "Warm yellow, medium-soft — a cozy, even golden glow.",
    "0 0 18px 2px rgba(255,236,180,0.42), 0 0 50px 9px rgba(255,206,120,0.2), 0 0 84px 14px rgba(240,190,110,0.1)",
    "radial-gradient(circle, rgba(255,236,180,0) 16%, rgba(255,224,150,0.36) 27%, rgba(245,196,110,0.15) 44%, rgba(245,196,110,0) 66%)",
  ),
];

export const MOON_VARIANTS: HaloVariant[] = [
  moon(
    "classic",
    "Classic",
    "Today's moon — cool light-blue core, mid blue, faint outer.",
    "0 0 18px 1px rgba(216,229,255,0.32), 0 0 46px 8px rgba(178,202,255,0.17), 0 0 84px 14px rgba(150,182,246,0.1)",
  ),
  moon(
    "frosty-corona",
    "Frosty corona",
    "Tight, bright, icy — a sharp moon on a clear cold night.",
    "0 0 12px 1px rgba(230,240,255,0.45), 0 0 28px 4px rgba(188,210,255,0.24), 0 0 48px 7px rgba(160,188,250,0.12)",
  ),
  moon(
    "lunar-mist",
    "Lunar mist",
    "Wide and faint — soft light diffusing through night air.",
    "0 0 34px 5px rgba(206,222,255,0.22), 0 0 80px 16px rgba(168,196,252,0.12), 0 0 130px 28px rgba(150,182,246,0.07)",
  ),
  moon(
    "silver",
    "Silver",
    "Neutral grey-white, desaturated — a cool, metallic glow.",
    "0 0 18px 1px rgba(235,240,248,0.34), 0 0 50px 9px rgba(205,214,230,0.18), 0 0 88px 15px rgba(180,192,212,0.09)",
  ),
  moon(
    "twilight",
    "Twilight",
    "Blue core shifting to violet at the edge — a hue shift outward.",
    "0 0 16px 1px rgba(220,230,255,0.34), 0 0 48px 8px rgba(180,180,255,0.18), 0 0 90px 16px rgba(150,130,230,0.1)",
  ),
  moon(
    "lavender-whisper",
    "Lavender whisper",
    "Barely there — soft lavender, minimal, lets the sky read through.",
    "0 0 16px 1px rgba(228,232,255,0.26), 0 0 48px 9px rgba(196,204,250,0.11)",
  ),
  moon(
    "indigo-aura",
    "Indigo aura",
    "Bold and deep — strong cool halo with an indigo outer.",
    "0 0 22px 2px rgba(210,224,255,0.4), 0 0 60px 12px rgba(150,176,255,0.24), 0 0 112px 22px rgba(96,124,230,0.13)",
  ),
  moon(
    "cool-fog",
    "Cool fog",
    "No defined rings — pure diffuse haze, like moon through cloud.",
    "0 0 60px 24px rgba(184,206,255,0.15), 0 0 110px 50px rgba(160,188,250,0.07)",
  ),
  moon(
    "aurora-tinted",
    "Aurora tinted",
    "Cool core with a subtle teal-green fringe in the outer ring.",
    "0 0 16px 1px rgba(224,238,255,0.32), 0 0 46px 8px rgba(168,222,224,0.18), 0 0 90px 16px rgba(130,206,196,0.1)",
  ),
  moon(
    "crisp-moonlight",
    "Crisp moonlight",
    "Bright tight core, clean mid — high-clarity full moon.",
    "0 0 12px 0 rgba(238,244,255,0.5), 0 0 34px 4px rgba(196,214,255,0.24), 0 0 72px 12px rgba(160,186,248,0.1)",
  ),
  moon(
    "pale-moonglow",
    "Pale moonglow",
    "Near-white, neutral — a quiet glow that lets the night read.",
    "0 0 18px 2px rgba(248,250,255,0.34), 0 0 52px 10px rgba(226,232,250,0.16), 0 0 92px 16px rgba(206,216,242,0.08)",
  ),
  moon(
    "deep-night",
    "Deep night",
    "Cold and saturated — a vivid blue halo for the darkest sky.",
    "0 0 14px 1px rgba(206,224,255,0.36), 0 0 40px 6px rgba(150,182,255,0.2), 0 0 96px 18px rgba(110,150,240,0.12)",
  ),
];
