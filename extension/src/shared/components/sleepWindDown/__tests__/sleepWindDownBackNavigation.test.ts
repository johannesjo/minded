import {
  shouldBackReturnToWindDownOverview,
  shouldUseWindDownHistoryBackForBottomBar,
  WIND_DOWN_OVERVIEW_VIEW,
} from "../sleepWindDownBackNavigation";

describe("sleep wind-down back navigation", () => {
  it("routes child views back to the wind-down overview", () => {
    expect(WIND_DOWN_OVERVIEW_VIEW).toBe("menu");
    expect(shouldBackReturnToWindDownOverview("brainDump")).toBe(true);
    expect(shouldBackReturnToWindDownOverview("gratitude")).toBe(true);
    expect(shouldBackReturnToWindDownOverview("tomorrow")).toBe(true);
    expect(shouldBackReturnToWindDownOverview("mood")).toBe(true);
    expect(shouldBackReturnToWindDownOverview("breathing")).toBe(true);
    expect(shouldBackReturnToWindDownOverview("calmRead")).toBe(true);
    expect(shouldBackReturnToWindDownOverview("tips")).toBe(true);
    expect(shouldBackReturnToWindDownOverview("snoozeIntent")).toBe(true);
    expect(shouldBackReturnToWindDownOverview("snoozeGoodnight")).toBe(true);
    expect(shouldBackReturnToWindDownOverview("goodnight")).toBe(true);
  });

  it("does not intercept back on the wind-down entry or overview views", () => {
    expect(shouldBackReturnToWindDownOverview("prompt")).toBe(false);
    expect(shouldBackReturnToWindDownOverview("menu")).toBe(false);
  });

  it("lets the bottom bar use history on wind-down routes only", () => {
    expect(shouldUseWindDownHistoryBackForBottomBar("/sleepWindDown")).toBe(
      true,
    );
    expect(shouldUseWindDownHistoryBackForBottomBar("/settings")).toBe(false);
    expect(shouldUseWindDownHistoryBackForBottomBar("/")).toBe(false);
  });
});
