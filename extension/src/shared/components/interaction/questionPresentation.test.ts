import { readFileSync } from "fs";
import { resolve } from "path";

const component = readFileSync(resolve(__dirname, "Question.tsx"), "utf8");
const styles = readFileSync(resolve(__dirname, "Question.scss"), "utf8");
const inputWithSend = readFileSync(
  resolve(__dirname, "../ui/InputWithSend.tsx"),
  "utf8",
);

describe("free-text question composition", () => {
  it("softly yields the prompt's space to the response editor", () => {
    expect(component).toContain('["input-shown"]: getShowInput()');
    expect(component).toContain('class="question-prompt-slot"');
    expect(styles).toMatch(
      /\.question-prompt-slot\s*\{[\s\S]*grid-template-rows:\s*1fr;/,
    );
    expect(styles).toMatch(
      /&\.input-shown \.question-prompt-slot\s*\{[\s\S]*grid-template-rows:\s*0fr;/,
    );
  });

  it("keeps the collapsed prompt as the editor's accessible label", () => {
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
});
