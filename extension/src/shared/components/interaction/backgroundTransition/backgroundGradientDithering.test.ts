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
  it("uses the dark grain treatment when dark mode is inherited from the app root", () => {
    const css = compileGrainMixin();

    expect(css).toMatch(
      /#minded-6622\.minded-6622-dark #minded-6622-coloured-wrapper::after\s*\{[^}]*opacity:\s*0\.09;[^}]*mix-blend-mode:\s*screen;/,
    );
  });

  it("renders one grain layer above every background-transition sky", () => {
    const css = compileBackgroundTransition();
    const component = readFileSync(
      resolve(__dirname, "BackgroundTransition.tsx"),
      "utf8",
    );

    expect(component).toContain(
      'class="background-transition-grain" aria-hidden="true"',
    );
    expect(css).toMatch(
      /\.background-transition-grain\s*\{[^}]*z-index:\s*2;[^}]*background-image:\s*var\(--grain-tile\);/,
    );
    expect(css).toMatch(
      /#minded-6622\.minded-6622-dark \.background-transition-grain\s*\{[^}]*opacity:\s*0\.09;[^}]*mix-blend-mode:\s*screen;/,
    );
  });
});
