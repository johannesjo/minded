import {
  getSessionIntentLabel,
  getSessionIntentTimeQuestion,
  SESSION_INTENT_OPTIONS,
} from "./sessionIntent.const";

describe("sessionIntent constants", () => {
  it("keeps stable preset IDs ordered by intentionality", () => {
    expect(SESSION_INTENT_OPTIONS.map((intent) => intent.id)).toEqual([
      "reply_or_message",
      "check_one_thing",
      "take_short_break",
    ]);
  });

  it("returns labels and time questions from IDs", () => {
    expect(getSessionIntentLabel({ id: "check_one_thing" })).toBe(
      "Check one thing",
    );
    expect(getSessionIntentTimeQuestion({ id: "check_one_thing" })).toBe(
      "How long for checking one thing?",
    );
    expect(getSessionIntentLabel()).toBe("");
    expect(getSessionIntentTimeQuestion()).toBe("How long do you want?");
  });

  it("returns a non-empty label and question for every preset id", () => {
    SESSION_INTENT_OPTIONS.forEach((intent) => {
      expect(getSessionIntentLabel(intent)).toMatch(/.+/);
      expect(getSessionIntentTimeQuestion(intent)).toMatch(/.+/);
    });
  });

  it("falls back gracefully for unknown ids (legacy stored data)", () => {
    const stale = { id: "not_sure_yet" as never };
    expect(getSessionIntentLabel(stale)).toBe("");
    expect(getSessionIntentTimeQuestion(stale)).toBe("How long do you want?");
  });
});
