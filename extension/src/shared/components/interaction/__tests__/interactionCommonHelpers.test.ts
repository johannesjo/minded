import { matchWidgetLine } from "@src/shared/components/interaction/interactionCommonHelpers";
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
