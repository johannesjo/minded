import { resolve } from "path";
import { compileString } from "sass";

const SRC_DIR = resolve(__dirname, "..");

const compile = (scss: string): string =>
  compileString(scss, {
    loadPaths: [SRC_DIR],
    quietDeps: true,
    silenceDeprecations: ["import", "mixed-decls"],
  }).css.replace(/\s+/g, " ");

const rgbaAlpha = (value: string): number => {
  const match = value.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
  if (!match) throw new Error(`could not read alpha from ${value}`);
  return Number(match[1]);
};

describe("visual system contracts", () => {
  it("keeps icon-button glyphs square instead of flex-stretching them", () => {
    const css = compile(
      [
        '@import "styles/mixins/mixins";',
        ".icon-probe { @include btnIco(52px); }",
      ].join("\n"),
    );
    const iconRule = css.match(
      /\.icon-probe\s*>\s*\.minded-6622-ico\s*\{([^}]*)\}/,
    );

    expect(iconRule).not.toBeNull();
    expect(iconRule![1]).toMatch(/margin:\s*0(?:px)?;/);
    expect(iconRule![1]).toMatch(/flex:\s*0 0 auto;/);
    expect(iconRule![1]).not.toMatch(/flex:\s*1;/);
  });

  it("keeps dark dashboard headings quieter than full-emphasis text", () => {
    const css = compile('@import "styles/variables";');
    const darkBlock = css.match(/#minded-6622\.minded-6622-dark\s*\{([^}]*)\}/);

    expect(darkBlock).not.toBeNull();
    const full = darkBlock![1].match(/--c-fg-full-emphasis:\s*([^;]+);/);
    const heading = darkBlock![1].match(/--h4-c:\s*([^;]+);/);
    expect(full).not.toBeNull();
    expect(heading).not.toBeNull();
    expect(rgbaAlpha(heading![1])).toBeLessThan(rgbaAlpha(full![1]));
  });

  it("keeps small and non-mobile breakpoints contiguous", () => {
    const css = compile(
      [
        '@import "styles/mixins/mixins";',
        ".small-probe { @include onSmallScreens { color: red; } }",
        ".non-mobile-probe { @include onNonMobileScreens { color: blue; } }",
      ].join("\n"),
    );

    expect(css).toContain("@media (max-width: 649px)");
    expect(css).toContain("@media (min-width: 650px)");
  });
});
