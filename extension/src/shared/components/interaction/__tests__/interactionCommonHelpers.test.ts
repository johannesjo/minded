import {
  matchWidgetLine,
  observeClassChanges,
} from "@src/shared/components/interaction/interactionCommonHelpers";
import { NOTICE_CUES } from "@src/shared/components/interaction/notice/notice.const";
import { ACTION_ADVICES } from "@src/shared/data/actionAdvices";
import { QUESTIONS } from "@src/shared/data/questions";
import { formatQuestionText } from "@src/util/formatQuestionText";

describe("matchWidgetLine", () => {
  it("recovers a notice cue from its verbatim line", () => {
    expect(matchWidgetLine(NOTICE_CUES[0].cue)).toEqual({
      mode: "NOTICE",
      cue: NOTICE_CUES[0],
    });
  });
  it("recovers an action advice from its verbatim line", () => {
    expect(matchWidgetLine(ACTION_ADVICES[0].txt)).toEqual({
      mode: "ACTION_ADVICE",
      advice: ACTION_ADVICES[0],
    });
  });
  it("recovers a question from its display form", () => {
    const q = QUESTIONS[0];
    expect(matchWidgetLine(formatQuestionText(q.t))).toEqual({
      mode: "QUESTION",
      question: q,
    });
  });
  it("is undefined for a line no pool shows", () => {
    expect(matchWidgetLine("definitely not a minded line")).toBeUndefined();
    expect(matchWidgetLine("")).toBeUndefined();
  });
});

describe("observeClassChanges", () => {
  it("observes nothing without an element or a MutationObserver", () => {
    expect(observeClassChanges(null, () => undefined)).toBeUndefined();
    // Jest runs in node here, where MutationObserver doesn't exist.
    expect(
      observeClassChanges({} as HTMLElement, () => undefined),
    ).toBeUndefined();
  });

  it("watches only the class attribute", () => {
    const observe = jest.fn();
    const original = (globalThis as { MutationObserver?: unknown })
      .MutationObserver;
    (globalThis as { MutationObserver?: unknown }).MutationObserver = jest.fn(
      () => ({ observe }),
    );
    const el = {} as HTMLElement;
    expect(observeClassChanges(el, () => undefined)).toBeDefined();
    expect(observe).toHaveBeenCalledWith(el, {
      attributes: true,
      attributeFilter: ["class"],
    });
    (globalThis as { MutationObserver?: unknown }).MutationObserver = original;
  });
});
