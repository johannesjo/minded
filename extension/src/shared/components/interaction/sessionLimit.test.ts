import {
  advanceIntentSelectionToTime,
  cancelIntentSelection,
  cancelTimeSelection,
  createActiveTimer,
  createAndroidSessionLimitPayload,
  shouldAskIntent,
} from "./sessionLimit";
import { SessionIntent } from "@src/dataInterface/syncData";

describe("sessionLimit helpers", () => {
  const intent: SessionIntent = { id: "check_one_thing" };

  it("advances from intent selection to time selection without dropping overlay state", () => {
    const calls: string[] = [];

    advanceIntentSelectionToTime(
      intent,
      (value) => calls.push(`pending:${value?.id ?? "none"}`),
      (value) => calls.push(`intent:${value}`),
      (value) => calls.push(`time:${value}`),
    );

    expect(calls).toEqual([
      "pending:check_one_thing",
      "time:true",
      "intent:false",
    ]);
  });

  it("clears pending intent on intent or time cancellation", () => {
    const intentCancelCalls: string[] = [];
    cancelIntentSelection(
      (value) => intentCancelCalls.push(`pending:${value?.id ?? "none"}`),
      (value) => intentCancelCalls.push(`intent:${value}`),
    );

    expect(intentCancelCalls).toEqual(["pending:none", "intent:false"]);

    const timeCancelCalls: string[] = [];
    cancelTimeSelection(
      (value) => timeCancelCalls.push(`pending:${value?.id ?? "none"}`),
      (value) => timeCancelCalls.push(`time:${value}`),
    );

    expect(timeCancelCalls).toEqual(["pending:none", "time:false"]);
  });

  it("creates enriched active timers with optional intent", () => {
    expect(
      createActiveTimer({
        seconds: 300,
        now: 1000,
        target: { kind: "host", id: "example.com" },
        platform: "web",
        intent,
      }),
    ).toEqual({
      endTS: 301000,
      durationS: 300,
      startedTS: 1000,
      target: { kind: "host", id: "example.com" },
      platform: "web",
      intent,
    });

    expect(
      createActiveTimer({
        seconds: 60,
        now: 1000,
        target: { kind: "host", id: "example.com" },
        platform: "web",
      }),
    ).not.toHaveProperty("intent");
  });

  it("creates Android bridge payloads with and without intent", () => {
    expect(JSON.parse(createAndroidSessionLimitPayload(300, intent))).toEqual({
      seconds: 300,
      intent,
    });

    expect(JSON.parse(createAndroidSessionLimitPayload(300))).toEqual({
      seconds: 300,
    });
  });

  it("skips intent selection for soft friction", () => {
    expect(shouldAskIntent("soft")).toBe(false);
    expect(shouldAskIntent("normal")).toBe(true);
    expect(shouldAskIntent("strong")).toBe(true);
  });
});
