import { readdirSync, readFileSync } from "fs";
import { join, relative, resolve } from "path";
import { compileString } from "sass";

const SRC_DIR = resolve(__dirname, "..");

const listTsxFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsxFiles(full));
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
};

interface BtnNode {
  voice: boolean;
  start: number;
  end: number;
}

// Locate every <Btn …> element in a source string, recording whether it carries
// the `voice` (serif) modifier and where the whole element begins and ends. The
// opening tag is walked char-by-char so `{}` expressions and quoted props that
// contain `>` don't fool a naive regex.
const findBtns = (src: string): BtnNode[] => {
  const nodes: BtnNode[] = [];
  const openRe = /<Btn(?=[\s/>])/g;
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(src))) {
    const start = m.index;
    let i = start + 4;
    let brace = 0;
    let quote: string | null = null;
    let selfClosing = false;
    for (; i < src.length; i++) {
      const c = src[i];
      if (quote) {
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "{") brace++;
      else if (c === "}") brace--;
      else if (c === ">" && brace === 0) {
        selfClosing = src[i - 1] === "/";
        break;
      }
    }
    const openTag = src.slice(start, i + 1);
    // `voice` is a bare boolean prop; match it only on prop boundaries so an
    // aria-label or class value that happens to contain the word can't count.
    // Blank out quoted prop *values* first (title="…voice…", class="…") so a
    // value carrying the word can never be mistaken for the modifier.
    const propsOnly = openTag.replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '""');
    const voice = /(?:^|\s)voice(?=[\s/>=])/.test(propsOnly);
    const closeIdx = selfClosing ? i + 1 : src.indexOf("</Btn>", i + 1);
    const end = selfClosing
      ? i + 1
      : closeIdx === -1
        ? i + 1
        : closeIdx + "</Btn>".length;
    nodes.push({ voice, start, end });
    openRe.lastIndex = i + 1;
  }
  return nodes;
};

// Two buttons are sibling controls in the same row/stack when nothing but
// whitespace sits between them - no closing container to separate them. JSX
// comments ({/* */}) and whitespace-only string spacers ({" "}) count as
// whitespace here, since they don't break the row. That is exactly the
// arrangement where a serif button beside a sans one reads as a font seam.
//
// Known limitation (text scan, not AST): a pair whose two buttons live on
// opposite sides of a conditional - `{cond ? <Btn voice/> : <Btn/>}` or two
// buttons split by a <Show> wrapper - is not treated as adjacent, so such a
// seam would slip through. No call site does this today; the check backstops
// the common flat-sibling row, which is where the daily-questions seam was.
const isSiblingGap = (gap: string): boolean =>
  /^\s*$/.test(
    gap
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/\{\s*(['"`])\s*\1\s*\}/g, ""),
  );

const lineOf = (src: string, index: number): number =>
  src.slice(0, index).split("\n").length;

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

  it("gives elevated cards a quiet inset edge instead of a heavy shadow", () => {
    const css = compile(
      [
        '@import "styles/mixins/mixins";',
        '@import "styles/variables";',
        '@import "styles/componentsMainOnly/card";',
      ].join("\n"),
    );

    expect(css).toContain("--dashboard-card-highlight:");
    expect(css).toMatch(
      /\.cardDashboard,[^{]*\.card\s*\{[^}]*box-shadow:\s*inset 0 1px 0 var\(--dashboard-card-highlight\)/,
    );
    expect(css).not.toMatch(/\.cardDashboard,[^{]*\.card\s*\{[^}]*drop-shadow/);
  });

  it("defines one reduced-motion-aware gentle transition tier", () => {
    const css = compile('@import "styles/variables";');
    const rootBlock = css.match(/#minded-6622\s*\{([^}]*)\}/);
    const reducedMotionBlock = css.match(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*#minded-6622\s*\{([^}]*)\}/,
    );

    expect(rootBlock).not.toBeNull();
    expect(rootBlock![1]).toMatch(/--dur-gentle:\s*700ms;/);
    expect(reducedMotionBlock).not.toBeNull();
    expect(reducedMotionBlock![1]).toMatch(/--dur-gentle:\s*0ms;/);
  });

  it("never sits a serif (voice) button beside a sans one in the same row", () => {
    // The chrome-vs-voice split is per *element*, but adjacent buttons read as
    // one control group: a serif `<Btn voice>` next to a plain sans `<Btn>`
    // shows a font seam (the daily-questions card once did this). The voice
    // belongs on the words the app speaks - the prompt above the buttons - so a
    // button group must be all-voice or all-sans, never mixed. Standalone voice
    // buttons (the app's usual pattern) and homogeneous groups stay fine.
    const violations: string[] = [];
    for (const file of listTsxFiles(SRC_DIR)) {
      const src = readFileSync(file, "utf8");
      const btns = findBtns(src);
      for (let k = 0; k + 1 < btns.length; k++) {
        const a = btns[k];
        const b = btns[k + 1];
        if (a.voice !== b.voice && isSiblingGap(src.slice(a.end, b.start))) {
          violations.push(
            `${relative(SRC_DIR, file)}:${lineOf(src, a.start)} - a <Btn${
              a.voice ? " voice" : ""
            }> sits next to a <Btn${b.voice ? " voice" : ""}> (line ${lineOf(
              src,
              b.start,
            )})`,
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("keeps small and non-mobile breakpoints adjacent at integer pixels", () => {
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
