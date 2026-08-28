import { resolve } from "path";
import { compileString } from "sass";

import {
  ambientSkyAccentsAt,
  ambientSkyColorsAt,
  ambientSkyLayeredBackground,
  hexToRgbChannels,
} from "./skyTimeline";

/**
 * Compiles the real stylesheet and asserts the light theme's composed
 * --background-gradient (and the --day-*-rgb defaults) against skyTimeline's
 * mirrors. The unit tests in skyTimeline.test.ts pin the TS side only - this
 * is the other half, so a geometry/alpha tweak in _variables.scss can't
 * silently diverge from ambientSkyLayeredBackground (the styleguide preview)
 * or the accent keyframes.
 */

const SRC_DIR = resolve(__dirname, "..");

const compiledVariables = (): string =>
  compileString('@import "styles/variables";', {
    loadPaths: [SRC_DIR],
    quietDeps: true,
    silenceDeprecations: ["import"],
  }).css.replace(/\s+/g, " ");

// Normalize away formatting-only differences between sass output and the TS
// builder string (line breaks inside gradient parens become spaces).
const normalize = (css: string): string =>
  css.replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim();

const varValues = (css: string, name: string): string[] => {
  const found = [...css.matchAll(new RegExp(`${name}:\\s*([^;]+);`, "g"))].map(
    (m) => m[1].trim(),
  );
  if (!found.length) throw new Error(`could not find ${name} in compiled CSS`);
  return found;
};

const firstVarValue = (css: string, name: string): string =>
  varValues(css, name)[0];

// The dark block redeclares after the light one, so its value is the second.
const darkVarValue = (css: string, name: string): string => {
  const values = varValues(css, name);
  if (values.length < 2) throw new Error(`${name} is not overridden in dark`);
  return values[1];
};

const channels = (hex: string): number[] =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

describe("the SCSS day sky mirrors skyTimeline (compiled _variables.scss ↔ TS)", () => {
  const css = compiledVariables();
  const morningColors = ambientSkyColorsAt(9);
  const morningAccents = ambientSkyAccentsAt(9);

  it("defaults the accent rgb vars to the 9:00 morning keyframe", () => {
    // First occurrences are the light theme's (the dark block never redefines
    // these vars).
    expect(firstVarValue(css, "--day-zenith-rgb")).toBe(
      hexToRgbChannels(morningAccents.zenith),
    );
    expect(firstVarValue(css, "--day-horizon-glow-rgb")).toBe(
      hexToRgbChannels(morningAccents.horizonGlow),
    );
  });

  it("composes the light --background-gradient exactly as ambientSkyLayeredBackground does", () => {
    // First occurrence is the light theme's (declared before the
    // .minded-6622-dark override).
    const scssComposite = firstVarValue(css, "--background-gradient")
      // Resolve the var() references the stylesheet uses to the same literal
      // values the TS builder inlines, then the strings must match verbatim.
      .replace(
        /var\(--day-horizon-glow-rgb\)/g,
        hexToRgbChannels(morningAccents.horizonGlow),
      )
      .replace(
        /var\(--day-zenith-rgb\)/g,
        hexToRgbChannels(morningAccents.zenith),
      )
      .replace(/var\(--c-gradient-(\d)\)/g, (_, n) => morningColors[n - 1]);

    expect(normalize(scssComposite)).toBe(
      normalize(ambientSkyLayeredBackground(morningColors, morningAccents)),
    );
  });
});

/**
 * The night sky's warm horizon is the sunset's afterglow, and it belongs to
 * the first hours of night only (nightAfterglowAt). Held all night it reads as
 * a permanent brown smudge under a cool sky. These pin the structure that
 * makes that true, so the warmth can't creep back into the resting sky.
 */
describe("the night sky's warmth is a fading layer, not a fixed colour", () => {
  const css = compiledVariables();

  it("defaults --night-afterglow to 0, so a sky with no JS behind it is deep night", () => {
    // The loading <style> blocks and the baked PNGs copy this gradient without
    // anything to set the var; deep night is the honest fallback for them.
    expect(firstVarValue(css, "--night-afterglow")).toBe("0");
  });

  it("scales every warm layer of the dark sky by --night-afterglow", () => {
    const gradient = darkVarValue(css, "--background-gradient");
    const tinted = gradient.match(/rgba\(/g) ?? [];
    const faded = gradient.match(/var\(--night-afterglow\)/g) ?? [];

    expect(tinted.length).toBeGreaterThan(0);
    expect(faded.length).toBe(tinted.length);
  });

  it("keeps the horizon stop of the base night gradient cool", () => {
    const [r, , b] = channels(darkVarValue(css, "--c-gradient-3"));
    expect(b).toBeGreaterThan(r);
  });
});
