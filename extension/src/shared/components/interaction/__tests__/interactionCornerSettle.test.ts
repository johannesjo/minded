import {
  getInteractionCornerSettle,
  getLocalSunSettleForPhase,
  pickInteractionSunSettle,
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
  sunRestingSettle,
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
  it("on Android lands at the bubble's reported disc size (the mini sun)", () => {
    const mini = { ...restCenter, discPx: 15 };
    expect(
      getInteractionCornerSettle({
        platform: "android",
        isArriving: true,
        restCenter: mini,
      }),
    ).toEqual(sunArriveSettleAt(restCenter, 15));
    expect(
      getInteractionCornerSettle({
        platform: "android",
        isArriving: false,
        restCenter: mini,
      }),
    ).toEqual(sunDepartSettleAt(restCenter, 15));
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

  it("reads the bubble's disc size when reported, ignoring a bad one", () => {
    expect(
      readLittleSunRestCenter(() => '{"fracX":0.07,"fracY":0.86,"discPx":15}'),
    ).toEqual({ x: 0.07, y: 0.86, discPx: 15 });
    expect(
      readLittleSunRestCenter(() => '{"fracX":0.07,"fracY":0.86,"discPx":-1}'),
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

describe("pickInteractionSunSettle", () => {
  const arrive = sunArriveSettle();
  const depart = sunDepartSettleAt(restCenter);
  const corners = { arrive: () => arrive, depart: () => depart };
  const base = {
    isArrivingFromCorner: false,
    phase: "interactive" as const,
    getRestingAnchor: () => null,
    corners,
    platform: "web" as const,
  };

  it("holds the disc at the corner while it arrives, whatever the phase", () => {
    expect(
      pickInteractionSunSettle({
        ...base,
        isArrivingFromCorner: true,
        phase: "departing",
      }),
    ).toBe(arrive);
  });

  it("rests under the measured choices, else on the static rest", () => {
    const anchor = { x: 180, y: 520 };
    expect(
      pickInteractionSunSettle({
        ...base,
        phase: "resting",
        getRestingAnchor: () => anchor,
      }),
    ).toEqual(sunRestingSettle(anchor));
    expect(pickInteractionSunSettle({ ...base, phase: "resting" })).toEqual(
      getLocalSunSettleForPhase("resting", "web"),
    );
  });

  it("departs to the Little Sun's corner, and otherwise follows the phase", () => {
    expect(pickInteractionSunSettle({ ...base, phase: "departing" })).toBe(
      depart,
    );
    expect(pickInteractionSunSettle(base)).toEqual(
      getLocalSunSettleForPhase("interactive", "web"),
    );
  });
});
