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
  // The dither only works because the noise tile is mid-grey (RGB carries the
  // noise) blended with soft-light. A pure-black tile — the old form — makes
  // `screen` a no-op and `overlay` near-useless, so the sky bands into visible
  // horizontal stripes. Pin the shape of the fix so that regression can't
  // silently return.
  const variablesScss = readFileSync(
    resolve(SRC_DIR, "styles/_variables.scss"),
    "utf8",
  );

  it("uses a mid-grey noise tile, not a pure-black one", () => {
    // Grey form copies the noise into R/G/B and forces alpha to 1
    // (feColorMatrix rows "0 0 0 1 0" ... alpha "0 0 0 0 1").
    expect(variablesScss).toContain("0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 1");
    // The old black form zeroed RGB and only varied alpha — must be gone.
    expect(variablesScss).not.toContain("0 0 0 0 0.55 0");
  });

  it("dithers the resting sky with soft-light in both themes", () => {
    const css = compileGrainMixin();

    // Light (default) grain layer.
    expect(css).toMatch(
      /#minded-6622-coloured-wrapper::after\s*\{[^}]*opacity:\s*0\.55;[^}]*mix-blend-mode:\s*soft-light;[^}]*background-image:\s*var\(--grain-tile\);/,
    );
    // Dark inherits the same soft-light blend, only a gentler opacity — never
    // `screen` (which over black does nothing).
    expect(css).toMatch(
      /#minded-6622\.minded-6622-dark #minded-6622-coloured-wrapper::after\s*\{[^}]*opacity:\s*0\.11;/,
    );
    expect(css).not.toContain("mix-blend-mode: screen");
    expect(css).not.toContain("mix-blend-mode: overlay");
  });

  it("renders one soft-light grain layer above every background-transition sky", () => {
    const css = compileBackgroundTransition();
    const component = readFileSync(
      resolve(__dirname, "BackgroundTransition.tsx"),
      "utf8",
    );

    expect(component).toContain(
      'class="background-transition-grain" aria-hidden="true"',
    );
    expect(css).toMatch(
      /\.background-transition-grain\s*\{[^}]*z-index:\s*2;[^}]*opacity:\s*0\.55;[^}]*mix-blend-mode:\s*soft-light;[^}]*background-image:\s*var\(--grain-tile\);/,
    );
    expect(css).toMatch(
      /#minded-6622\.minded-6622-dark \.background-transition-grain\s*\{[^}]*opacity:\s*0\.11;/,
    );
    // Neither theme may fall back to the no-op blends (screen over black does
    // nothing; overlay of the tile barely dithers). Guards the dark rule too,
    // whose regex above only pins opacity.
    expect(css).not.toContain("mix-blend-mode: screen");
    expect(css).not.toContain("mix-blend-mode: overlay");
  });

  it("dithers the grounding stage's full-screen sky, in both themes", () => {
    // The grounding stage paints its own opaque --background-gradient sky over
    // the dashboard, so the wrapper's grain can't reach it — it carries its own
    // soft-light dither. CSS-module class names are hashed, so match against the
    // raw source rather than compiled selectors.
    const scss = normalizeCss(
      readFileSync(
        resolve(__dirname, "../grounding/GroundingOverlay.module.scss"),
        "utf8",
      ),
    );

    expect(scss).toMatch(
      /&::after\s*\{[^}]*opacity:\s*0\.55;[^}]*mix-blend-mode:\s*soft-light;[^}]*background-image:\s*var\(--grain-tile\);/,
    );
    expect(scss).toMatch(
      /:global\(\.minded-6622-dark\)\s*&::after\s*\{\s*opacity:\s*0\.11;/,
    );
  });

  it("keeps the standalone styleguide preview on the same soft-light dither", () => {
    // The preview duplicates the grain rule inline (it can't @include the mixin),
    // so pin it directly — it changed with the fix and must not drift back to
    // overlay/screen.
    const html = normalizeCss(
      readFileSync(resolve(SRC_DIR, "pages/styleguide/index.html"), "utf8"),
    );

    expect(html).toMatch(
      /#minded-6622::after\s*\{[^}]*opacity:\s*0\.55;[^}]*mix-blend-mode:\s*soft-light;[^}]*background-image:\s*var\(--grain-tile\);/,
    );
    expect(html).toMatch(
      /#minded-6622\.minded-6622-dark::after\s*\{\s*opacity:\s*0\.11;/,
    );
    // The old, ineffective blends must be gone from the preview grain.
    expect(html).not.toContain("mix-blend-mode: overlay");
    expect(html).not.toContain("mix-blend-mode: screen");
  });
});
