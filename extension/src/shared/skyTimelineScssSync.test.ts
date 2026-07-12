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
 * mirrors. The unit tests in skyTimeline.test.ts pin the TS side only — this
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

const firstVarValue = (css: string, name: string): string => {
  const match = css.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`could not find ${name} in compiled CSS`);
  return match[1].trim();
};

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
