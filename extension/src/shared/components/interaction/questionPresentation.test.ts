import { readFileSync } from "fs";
import { resolve } from "path";

const component = readFileSync(resolve(__dirname, "Question.tsx"), "utf8");
const styles = readFileSync(resolve(__dirname, "Question.scss"), "utf8");
const inputWithSend = readFileSync(
  resolve(__dirname, "../ui/InputWithSend.tsx"),
  "utf8",
);

describe("free-text question composition", () => {
  it("keeps the prompt visible while the response editor is open", () => {
    // The intervention question stays in view the whole time you write - it
    // must never collapse away once the input opens.
    expect(component).not.toContain('["input-shown"]: getShowInput()');
    expect(component).not.toContain('class="question-prompt-slot"');
    expect(styles).not.toMatch(/grid-template-rows:\s*0fr/);
  });

  it("keeps the prompt as the editor's accessible label", () => {
    expect(component).toContain(
      'role={hasChips || getShowInput() ? undefined : "button"}',
    );
    expect(component).toContain('aria-labelledby="minded-6622-question"');
    expect(inputWithSend).toContain('"aria-labelledby"?: string;');
    expect(inputWithSend).toContain(
      'aria-labelledby={props["aria-labelledby"]}',
    );
  });

  it("turns the response into a content-growing reflective writing surface", () => {
    expect(component).toContain("reflective");
    expect(component).toContain("autoGrow");
    expect(component).toContain('placeholder="write here…"');
    expect(component).toContain("isSubmitReady={isAnswerReady}");
    expect(inputWithSend).toContain("reflective?: boolean;");
    expect(inputWithSend).toContain("autoGrow?: boolean;");
    expect(inputWithSend).toContain("resizeToContent");
    expect(inputWithSend).toContain("scrollHeight");
    expect(inputWithSend).toContain("offsetHeight");
    expect(styles).toMatch(
      /&\.reflective\s*\{[\s\S]*font-family:\s*var\(--font-display\);/,
    );
    expect(styles).toMatch(
      /&\.reflective\s*\{[\s\S]*background:\s*transparent;/,
    );
    expect(styles).toMatch(
      /\.send-button\.is-ready\s*\{[\s\S]*visibility:\s*visible;/,
    );
  });

  it("cuts the stable baseline only while the completion control is shown", () => {
    expect(inputWithSend).toContain('["submit-ready"]');
    expect(styles).toMatch(
      /&\.reflective\s*\{[\s\S]*display:\s*grid;[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) var\(--btn-height\);/,
    );
    expect(styles).toMatch(
      /&\.reflective\s*\{[\s\S]*&::after\s*\{[\s\S]*left:\s*var\(--space-sm\);[\s\S]*right:\s*var\(--space-sm\);/,
    );
    expect(styles).toMatch(
      /&\.submit-ready::after\s*\{[\s\S]*right:\s*calc\(var\(--space-sm\) \+ var\(--btn-height\)\);/,
    );
    expect(styles).toMatch(
      /&\.reflective\s*\{[\s\S]*\.send-button\s*\{[\s\S]*grid-column:\s*2;[\s\S]*position:\s*relative;/,
    );
    expect(styles).toMatch(
      /\.send-button\.is-ready\s*\{[\s\S]*transform:\s*translateY\(50%\) scale\(1\);/,
    );
    expect(styles).toMatch(
      /&\.reflective\s*\{[\s\S]*\.send-button\s*\{[\s\S]*background:\s*var\(--btn-bg-not-selected\);/,
    );
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*#minded-6622-inp\.reflective::after,[\s\S]*transition:\s*none;/,
    );
    expect(styles).not.toContain("width: calc(100% - var(--btn-height))");
    expect(inputWithSend).not.toMatch(/variant="icon"[\s\S]{0,80}\ssmall/);
  });
});
