import { readFileSync } from "fs";
import { resolve } from "path";

const readSource = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

const ruleBody = (scss: string, selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = scss.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!match) throw new Error(`could not find ${selector}`);
  return match[1];
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
    expect(time).toContain("<Btn\n                plain");
    expect(ruleBody(intentStyles, ".intent-options-grid")).toMatch(
      /display:\s*grid[\s\S]*grid-template-columns:\s*1fr/,
    );
    expect(ruleBody(timeStyles, ".time-options-grid")).toMatch(
      /display:\s*grid[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
    );
  });
});
