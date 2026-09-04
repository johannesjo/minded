import {
  isDetectionSilent,
  parseDetectionHealth,
} from "@src/android/util/detectionHealth";

describe("parseDetectionHealth", () => {
  it("reads the two flags the native side writes", () => {
    expect(
      parseDetectionHealth(
        '{"accessibilityEnabled":true,"serviceConnected":false}',
      ),
    ).toEqual({ accessibilityEnabled: true, serviceConnected: false });
  });

  it.each([undefined, null, "", "not json", "{}", '{"serviceConnected":1}'])(
    "treats a missing or malformed read (%p) as watching, never as silent",
    (raw) => {
      expect(isDetectionSilent(parseDetectionHealth(raw))).toBe(false);
    },
  );
});

describe("isDetectionSilent", () => {
  it("is silent only when enabled in settings but not bound", () => {
    expect(
      isDetectionSilent({
        accessibilityEnabled: true,
        serviceConnected: false,
      }),
    ).toBe(true);
  });

  it("stays quiet when accessibility is off - that's the permission banner's job", () => {
    expect(
      isDetectionSilent({
        accessibilityEnabled: false,
        serviceConnected: false,
      }),
    ).toBe(false);
  });

  it("stays quiet while the service is bound", () => {
    expect(
      isDetectionSilent({ accessibilityEnabled: true, serviceConnected: true }),
    ).toBe(false);
  });
});
