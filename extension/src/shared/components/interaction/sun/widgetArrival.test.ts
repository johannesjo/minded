import { parseWidgetSunFrom } from "./widgetArrival";

describe("parseWidgetSunFrom", () => {
  it("turns the widget sun's centre + size into an arriving settle", () => {
    expect(parseWidgetSunFrom("0.25,0.6,48.5")).toEqual(
      expect.objectContaining({
        anchorXRatio: 0.25,
        anchorYRatio: 0.6,
        discPx: 48.5,
        // Arriving onto our own sky: the halo stays white (THE HALO RULE).
        warmth: 0,
      }),
    );
  });

  it.each([
    undefined,
    ["0.5,0.5,40"],
    "",
    "0.5,0.5",
    "0.5,0.5,40,1",
    "1.2,0.5,40",
    "0.5,-0.1,40",
    "0.5,0.5,2",
    "0.5,0.5,9999",
    "0.5,0.5,NaN",
    "0x1,0.5,40",
    "0.5,0.5,4e1",
    "0.5, 0.5,40",
  ])("rejects %p - a bad value falls back to the companion rise", (raw) => {
    expect(parseWidgetSunFrom(raw)).toBeNull();
  });
});
