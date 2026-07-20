import { readFileSync } from "fs";
import { resolve } from "path";
import { compileString } from "sass";

const SRC_DIR = resolve(process.cwd(), "src");

const readSource = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

const ruleBody = (scss: string, selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = scss.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!match) throw new Error(`could not find ${selector}`);
  return match[1];
};

const compiledButtons = compileString(
  readSource("src/styles/componentsShared/btn.scss").replace(/@src\//g, ""),
  {
    loadPaths: [SRC_DIR],
    quietDeps: true,
    silenceDeprecations: ["import", "mixed-decls"],
  },
).css;

const exactRuleBodies = (css: string, selector: string): string[] => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^{}]*)\\}`, "g"))].map(
    (match) => match[1],
  );
};

describe("button presentation", () => {
  const component = readSource("src/shared/components/ui/Btn.tsx");
  const mixins = readSource("src/styles/mixins/btn.scss");
  const variables = readSource("src/styles/_variables.scss");

  it("uses functional type by default and an explicit mindful voice modifier", () => {
    const base = ruleBody(mixins, "@mixin btnBase($height: var(--btn-height))");

    expect(base).not.toContain("font-family: var(--font-display)");
    expect(component).toMatch(/voice\?:\s*boolean/);
    expect(component).toContain('classes.push("isVoice")');
    expect(mixins).toMatch(
      /@mixin btnTxtVoiceModifier\(\)[\s\S]*?@include displayVoice/,
    );
    expect(compiledButtons).toMatch(/\.btnTxt\.isVoice[\s,]/);
  });

  it("lets fill changes carry hover and selection without a global bloom or scale", () => {
    const base = ruleBody(mixins, "@mixin btnBase($height: var(--btn-height))");

    expect(base).toMatch(
      /@media \(hover: hover\)[\s\S]*?&:where\(:not\(:disabled\)\):hover[\s\S]*?background:\s*var\(--btn-bg-selectable-hover\)/,
    );
    expect(mixins).not.toContain("box-shadow: var(--btn-box-shadow)");
    expect(mixins).not.toContain("transform: scale(var(--btn-selected-scale))");
    expect(variables).not.toContain("--btn-box-shadow");
    expect(variables).not.toContain("--btn-selected-scale");
  });

  it("keeps disabled modifiers still and lets pressed toggles release softly", () => {
    for (const selector of [
      ".btnTxt.isOutline",
      ".btnTxt.isSoft",
      ".btnTxt.isPlain",
      ".btnIco.isPlain",
      ".btnToggleSelect",
    ]) {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      expect(compiledButtons).toMatch(
        new RegExp(`${escaped}:where\\(:not\\(:disabled\\)\\):hover`),
      );
    }

    const toggleTransitions = exactRuleBodies(
      compiledButtons,
      ".btnToggleSelect",
    ).flatMap((body) =>
      [...body.matchAll(/transition:\s*([^;]+);/g)].map((match) => match[1]),
    );
    expect(toggleTransitions.at(-1)).toContain("transform");

    const selectedBodies = exactRuleBodies(
      compiledButtons,
      ".btnToggleSelect.isSelected",
    );
    expect(selectedBodies.join("\n")).not.toMatch(/opacity:\s*1/);
  });

  it("presents intent and duration actions as quiet typographic choices", () => {
    const intent = readSource(
      "src/shared/components/interaction/intentSelection/IntentSelection.tsx",
    );
    const intentStyles = readSource(
      "src/shared/components/interaction/intentSelection/IntentSelection.scss",
    );
    const time = readSource(
      "src/shared/components/interaction/timeSelection/TimeSelection.tsx",
    );
    const timeStyles = readSource(
      "src/shared/components/interaction/timeSelection/TimeSelection.scss",
    );

    expect(intent).not.toContain('variant="toggle"');
    expect(time).not.toContain('variant="toggle"');
    expect(intent.match(/<Btn\s+plain/g)).toHaveLength(2);
    expect(time).toMatch(/<Btn\s+plain\s+class="time-option"/);
    expect(ruleBody(intentStyles, ".intent-options-grid")).toMatch(
      /display:\s*grid[\s\S]*grid-template-columns:\s*1fr/,
    );
    expect(ruleBody(timeStyles, ".time-options-grid")).toMatch(
      /display:\s*grid[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
    );
  });
});
