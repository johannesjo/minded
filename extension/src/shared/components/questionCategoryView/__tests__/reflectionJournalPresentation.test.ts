import { readFileSync } from "fs";
import { resolve } from "path";

const readSource = (filename: string): string =>
  readFileSync(resolve(__dirname, "..", filename), "utf8");

const listComponent = readSource("AnswerListEditable.tsx");
const listStyles = readSource("AnswerListEditable.module.scss");
const entryComponent = readSource("AnswerEntry.tsx");
const entryStyles = readSource("AnswerEntry.module.scss");
const normalizedListComponent = listComponent.replace(/\s+/g, " ");
const normalizedEntryComponent = entryComponent.replace(/\s+/g, " ");

describe("reflection history journal presentation", () => {
  it("keeps reflections in one readable column", () => {
    expect(listStyles).toMatch(/\.AnswerListEditable\s*\{[\s\S]*?max-width:/);
    expect(listStyles).not.toContain("grid-template-columns");
  });

  it("shows a restrained empty-state invitation", () => {
    expect(listComponent).toContain(
      "props.answers.length === 0 && !getIsAddMode()",
    );
    expect(listComponent).toContain("Your reflections will gather here.");
    expect(listStyles).toContain(".emptyState");
  });

  it("reveals edit actions through the existing tap signal and keyboard focus", () => {
    expect(entryComponent).toContain(
      "[styles.isEditBarVisible]: getIsShowEditBar()",
    );
    expect(entryComponent).toContain("onFocusIn");
    expect(entryComponent).toContain("onFocusOut");
    expect(entryComponent).toContain('role="group"');
    expect(entryComponent).toContain(
      "tabindex={getIsEditMode() ? undefined : 0}",
    );
    expect(entryStyles).toContain(".AnswerEntry.isEditBarVisible &");
    expect(entryStyles).toContain(".AnswerEntry:focus-within &");
  });

  it("restores card focus when editing is canceled or committed", () => {
    expect(entryComponent).toContain("let entryEl: HTMLDivElement");
    expect(normalizedEntryComponent).toContain(
      "ref={(el) => { entryEl = el; }}",
    );
    expect(entryComponent).toContain(
      "const entryDomId = `answer-entry-${props.answer.id}`;",
    );
    expect(entryComponent).toContain("id={entryDomId}");
    expect(entryComponent).toContain("const restoreEntryFocus");
    expect(normalizedEntryComponent).toContain(
      "entryEl.ownerDocument.getElementById(entryDomId)?.focus();",
    );
    expect(normalizedEntryComponent).toMatch(
      /const abortEdit = \(\) => \{[^}]*setIsEditMode\(false\);[^}]*restoreEntryFocus\(\);/,
    );
    expect(normalizedEntryComponent).toContain(
      "const shouldRestoreFocus = !nextTarget || entryEl.contains(nextTarget);",
    );
    expect(normalizedEntryComponent).toContain(
      "setIsEditMode(false); if (shouldRestoreFocus) restoreEntryFocus();",
    );
  });

  it("closes a newly-added reflection on Escape and returns focus to the Add action", () => {
    expect(entryComponent).toContain("onCancel?: () => void;");
    expect(normalizedEntryComponent).toMatch(
      /const abortEdit = \(\) => \{[^}]*props\.onCancel\?\.\(\)/,
    );
    expect(normalizedListComponent).toMatch(
      /const cancelAdd = \(\) => \{[^}]*setIsAddMode\(false\);[^}]*focus\(\)/,
    );
    expect(listComponent).toContain("onCancel={cancelAdd}");
  });
});
