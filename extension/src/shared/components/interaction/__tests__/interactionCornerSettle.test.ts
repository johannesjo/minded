import {
  getInteractionCornerSettle,
  getLocalSunSettleForPhase,
  readLittleSunRestCenter,
} from "@src/shared/components/interaction/interactionCornerSettle";
import {
  getSunSettleForPhase,
  LITTLE_SUN_CORNER_PX_ANDROID,
  LITTLE_SUN_CORNER_PX_WEB,
  LITTLE_SUN_DISC_PX_ANDROID,
  LITTLE_SUN_DISC_PX_WEB,
  sunArriveSettle,
  sunArriveSettleAt,
  sunDepartSettleAt,
} from "@src/shared/components/interaction/sun/sunSettle";

const restCenter = { x: 0.07, y: 0.86 };

describe("getInteractionCornerSettle", () => {
  it("on Android lands on the bubble's reported rest centre, both ways", () => {
    expect(
      getInteractionCornerSettle({
        platform: "android",
        isArriving: true,
        restCenter,
      }),
    ).toEqual(sunArriveSettleAt(restCenter));
    expect(
      getInteractionCornerSettle({
        platform: "android",
        isArriving: false,
        restCenter,
      }),
    ).toEqual(sunDepartSettleAt(restCenter));
  });
  it("on Android without a reported centre uses the Android corner constants", () => {
    expect(
      getInteractionCornerSettle({
        platform: "android",
        isArriving: true,
        restCenter: null,
      }),
    ).toEqual(
      sunArriveSettle(LITTLE_SUN_CORNER_PX_ANDROID, LITTLE_SUN_DISC_PX_ANDROID),
    );
  });
  it("on the web ignores any rest centre and uses the web corner", () => {
    expect(
      getInteractionCornerSettle({
        platform: "web",
        isArriving: true,
        restCenter,
      }),
    ).toEqual(
      sunArriveSettle(LITTLE_SUN_CORNER_PX_WEB, LITTLE_SUN_DISC_PX_WEB),
    );
    expect(
      getInteractionCornerSettle({
        platform: "web",
        isArriving: false,
        restCenter,
      }),
    ).toEqual(
      getSunSettleForPhase(
        "departing",
        undefined,
        LITTLE_SUN_CORNER_PX_WEB,
        LITTLE_SUN_DISC_PX_WEB,
      ),
    );
  });
});

describe("getLocalSunSettleForPhase", () => {
  it("sizes the phase settle for the platform", () => {
    expect(getLocalSunSettleForPhase("departing", "android")).toEqual(
      getSunSettleForPhase(
        "departing",
        undefined,
        LITTLE_SUN_CORNER_PX_ANDROID,
        LITTLE_SUN_DISC_PX_ANDROID,
      ),
    );
    expect(getLocalSunSettleForPhase("interactive", undefined)).toEqual(
      getSunSettleForPhase(
        "interactive",
        undefined,
        LITTLE_SUN_CORNER_PX_WEB,
        LITTLE_SUN_DISC_PX_WEB,
      ),
    );
  });
});

describe("readLittleSunRestCenter", () => {
  it("reads the bubble's rest centre from the bridge", () => {
    expect(
      readLittleSunRestCenter(() => '{"fracX":0.07,"fracY":0.86}'),
    ).toEqual({ x: 0.07, y: 0.86 });
  });

  it("clamps an off-screen centre back onto the viewport", () => {
    expect(readLittleSunRestCenter(() => '{"fracX":-2,"fracY":3}')).toEqual({
      x: 0,
      y: 1,
    });
  });

  it("falls back to the corner (null) on anything unusable", () => {
    expect(readLittleSunRestCenter(() => null)).toBeNull();
    expect(readLittleSunRestCenter(() => "")).toBeNull();
    expect(readLittleSunRestCenter(() => "not json")).toBeNull();
    expect(readLittleSunRestCenter(() => '{"fracX":"a","fracY":1}')).toBeNull();
    expect(
      readLittleSunRestCenter(() => {
        throw new Error("bridge gone");
      }),
    ).toBeNull();
  });
});
