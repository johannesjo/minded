import { readFileSync } from "fs";
import { resolve } from "path";
import { compileString } from "sass";

const SRC_DIR = resolve(__dirname, "../../../..");

const normalizeCss = (css: string): string => css.replace(/\s+/g, " ");

const compileGrainMixin = (): string =>
  normalizeCss(
    compileString(
      [
        "@import 'styles/mixins/grain';",
        "#minded-6622-coloured-wrapper { @include grainOverlay; }",
      ].join("\n"),
      {
        loadPaths: [SRC_DIR],
        quietDeps: true,
        silenceDeprecations: ["import"],
      },
    ).css,
  );

const compileBackgroundTransition = (): string =>
  normalizeCss(
    compileString(
      "@import 'shared/components/interaction/backgroundTransition/BackgroundTransition';",
      {
        loadPaths: [SRC_DIR],
        quietDeps: true,
        silenceDeprecations: ["import"],
      },
    ).css,
  );

describe("full-screen gradient dithering", () => {
  // The dither works by compositing a HIGH-CONTRAST grey-noise tile with plain
  // `mix-blend-mode: normal`. Every earlier attempt leaned on a blend mode
  // (screen/overlay over a black tile, then soft-light over a low-contrast grey
  // tile) to amplify a faint tile into dither - but blend-mode amplification
  // scales with backdrop luminance and fades under HiDPI upscaling, so the bands
  // survived on the light/dark extremes and on retina screens. Source-over adds a
  // uniform, backdrop-independent perturbation instead; the contrast now lives in
  // the tile (feComponentTransfer), not the blend. Pin the shape so a regression
  // to any amplifying blend can't silently return.
  const variablesScss = readFileSync(
    resolve(SRC_DIR, "styles/_variables.scss"),
    "utf8",
  );

  it("uses a mid-grey noise tile, not a pure-black one", () => {
    // Grey form copies the noise into R/G/B and forces alpha to 1
    // (feColorMatrix rows "0 0 0 1 0" ... alpha "0 0 0 0 1").
    expect(variablesScss).toContain("0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 1");
    // The old black form zeroed RGB and only varied alpha - must be gone.
    expect(variablesScss).not.toContain("0 0 0 0 0.55 0");
  });

  it("ships the dither contrast in the tile, in sRGB", () => {
    // A steep linear component transfer is what lets a low opacity still cross a
    // full code-level under a non-amplifying `normal` blend. Without it the tile
    // is near-flat grey and dithers nothing.
    expect(variablesScss).toContain("feComponentTransfer");
    expect(variablesScss).toMatch(/slope='2\.6'\s+intercept='-0\.8'/);
    // sRGB keeps the noise mean centred (linearRGB milked the sky off-grey).
    expect(variablesScss).toContain("color-interpolation-filters='sRGB'");
  });

  it("dithers the resting sky with a normal blend in both themes", () => {
    const css = compileGrainMixin();

    // Light (default) grain layer.
    expect(css).toMatch(
      /#minded-6622-coloured-wrapper::after\s*\{[^}]*opacity:\s*0\.04;[^}]*mix-blend-mode:\s*normal;[^}]*background-image:\s*var\(--grain-tile\);/,
    );
    // Dark trims the opacity only to keep the night blacks deep (the blend is
    // backdrop-independent, so this is not a strength correction).
    expect(css).toMatch(
      /#minded-6622\.minded-6622-dark #minded-6622-coloured-wrapper::after\s*\{[^}]*opacity:\s*0\.03;/,
    );
    // None of the amplifying blends may return - they are what banded.
    expect(css).not.toContain("mix-blend-mode: soft-light");
    expect(css).not.toContain("mix-blend-mode: screen");
    expect(css).not.toContain("mix-blend-mode: overlay");
  });

  it("renders one normal-blend grain layer above every background-transition sky", () => {
    const css = compileBackgroundTransition();
    const component = readFileSync(
      resolve(__dirname, "BackgroundTransition.tsx"),
      "utf8",
    );

    expect(component).toContain(
      'class="background-transition-grain" aria-hidden="true"',
    );
    expect(css).toMatch(
      /\.background-transition-grain\s*\{[^}]*z-index:\s*2;[^}]*opacity:\s*0\.04;[^}]*mix-blend-mode:\s*normal;[^}]*background-image:\s*var\(--grain-tile\);/,
    );
    expect(css).toMatch(
      /#minded-6622\.minded-6622-dark \.background-transition-grain\s*\{[^}]*opacity:\s*0\.03;/,
    );
    // Neither theme may fall back to the old amplifying blends.
    expect(css).not.toContain("mix-blend-mode: soft-light");
    expect(css).not.toContain("mix-blend-mode: screen");
    expect(css).not.toContain("mix-blend-mode: overlay");
  });

  it("dithers the grounding stage's full-screen sky, in both themes", () => {
    // The grounding stage paints its own opaque --background-gradient sky over
    // the dashboard, so the wrapper's grain can't reach it - it carries its own
    // normal-blend dither. CSS-module class names are hashed, so match against the
    // raw source rather than compiled selectors.
    const scss = normalizeCss(
      readFileSync(
        resolve(__dirname, "../grounding/GroundingOverlay.module.scss"),
        "utf8",
      ),
    );

    expect(scss).toMatch(
      /&::after\s*\{[^}]*opacity:\s*0\.04;[^}]*mix-blend-mode:\s*normal;[^}]*background-image:\s*var\(--grain-tile\);/,
    );
    expect(scss).toMatch(
      /:global\(\.minded-6622-dark\)\s*&::after\s*\{\s*opacity:\s*0\.03;/,
    );
  });

  it("keeps the standalone styleguide preview on the same normal-blend dither", () => {
    // The preview duplicates the grain rule inline (it can't @include the mixin),
    // so pin it directly - it changed with the fix and must not drift back to an
    // amplifying blend.
    const html = normalizeCss(
      readFileSync(resolve(SRC_DIR, "pages/styleguide/index.html"), "utf8"),
    );

    expect(html).toMatch(
      /#minded-6622::after\s*\{[^}]*opacity:\s*0\.04;[^}]*mix-blend-mode:\s*normal;[^}]*background-image:\s*var\(--grain-tile\);/,
    );
    expect(html).toMatch(
      /#minded-6622\.minded-6622-dark::after\s*\{\s*opacity:\s*0\.03;/,
    );
    // The old, band-prone blends must be gone from the preview grain.
    expect(html).not.toContain("mix-blend-mode: soft-light");
    expect(html).not.toContain("mix-blend-mode: overlay");
    expect(html).not.toContain("mix-blend-mode: screen");
  });
});
