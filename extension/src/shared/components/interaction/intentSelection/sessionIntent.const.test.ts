import {
  getSessionIntentLabel,
  getSessionIntentTimeQuestion,
  SESSION_INTENT_OPTIONS,
} from "./sessionIntent.const";

describe("sessionIntent constants", () => {
  it("keeps stable preset IDs", () => {
    expect(SESSION_INTENT_OPTIONS.map((intent) => intent.id)).toEqual([
      "reply_or_message",
      "check_one_thing",
      "take_short_break",
      "not_sure_yet",
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
});
