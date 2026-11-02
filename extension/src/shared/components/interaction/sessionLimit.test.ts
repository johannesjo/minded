import {
  createActiveTimer,
  createAndroidSessionLimitPayload,
} from "./sessionLimit";

describe("sessionLimit helpers", () => {
  it("creates enriched active timers", () => {
    expect(
      createActiveTimer({
        seconds: 300,
        now: 1000,
        target: { kind: "host", id: "example.com" },
        platform: "web",
      }),
    ).toEqual({
      endTS: 301000,
      durationS: 300,
      startedTS: 1000,
      target: { kind: "host", id: "example.com" },
      platform: "web",
    });
  });

  it("creates Android bridge payloads", () => {
    expect(JSON.parse(createAndroidSessionLimitPayload(300))).toEqual({
      seconds: 300,
    });
  });
});
