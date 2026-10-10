import { moonPhaseAt, type MoonPhase } from "./lunarPhase";
import { moonShadowLayerFor } from "./moonShadow";

const phase = (cycle: number): MoonPhase => ({
  cycle,
  illumination: (1 - Math.cos(2 * Math.PI * cycle)) / 2,
  isWaxing: cycle < 0.5,
});
const isMirrored = (layer: string) => layer.includes("matrix(-1 0 0 1 100 0)");
const terminator = (layer: string) =>
  layer
    .match(/A([\d.]+),50 0 0 ([01]) 50,0/)!
    .slice(1)
    .map(Number);

describe("moonShadowLayerFor", () => {
  it("draws no shadow at full moon", () => {
    expect(moonShadowLayerFor(phase(0.5))).toBe("none");
    expect(
      moonShadowLayerFor(moonPhaseAt(new Date("2025-09-07T18:09:00Z"))),
    ).toBe("none");
  });

  it("keeps the new moon a visible, earthshine-lit disc - never a hole", () => {
    const layer = moonShadowLayerFor(phase(0));
    expect(layer).toContain("opacity='0.7'");
    // The terminator spans the whole disc: rx 50, bulging into the lit side.
    expect(terminator(layer)).toEqual([50, 0]);
  });

  it("closes the lit side's clear margin at new moon, so no step at the poles", () => {
    const limb = (layer: string) =>
      Number(layer.match(/A([\d.]+),50 0 0 1 50,100/)![1]);
    // The limb arc and the terminator coincide: nothing past the rim is clear.
    expect(limb(moonShadowLayerFor(phase(0)))).toBe(50);
    expect(limb(moonShadowLayerFor(phase(0.1)))).toBeGreaterThan(50);
    expect(limb(moonShadowLayerFor(phase(0.4)))).toBe(70);
  });

  it("bulges the terminator into the light for a crescent, away for a gibbous", () => {
    expect(terminator(moonShadowLayerFor(phase(0.1)))[1]).toBe(0);
    expect(terminator(moonShadowLayerFor(phase(0.4)))[1]).toBe(1);
  });

  it("has a straight terminator at the quarters", () => {
    expect(terminator(moonShadowLayerFor(phase(0.25)))[0]).toBe(0);
    expect(terminator(moonShadowLayerFor(phase(0.75)))[0]).toBe(0);
  });

  it("lights the right side waxing and the left side waning (north)", () => {
    expect(isMirrored(moonShadowLayerFor(phase(0.2)))).toBe(false);
    expect(isMirrored(moonShadowLayerFor(phase(0.8)))).toBe(true);
  });

  it("flips left-right in the southern hemisphere", () => {
    expect(isMirrored(moonShadowLayerFor(phase(0.2), true))).toBe(true);
    expect(isMirrored(moonShadowLayerFor(phase(0.8), true))).toBe(false);
  });

  it("softens the terminator (blurred, no hard edge)", () => {
    expect(moonShadowLayerFor(phase(0.3))).toContain("feGaussianBlur");
  });

  it("is a well-formed CSS url() with every # escaped", () => {
    const layer = moonShadowLayerFor(phase(0.3));
    expect(layer.startsWith('url("data:image/svg+xml;utf8,<svg')).toBe(true);
    expect(layer.endsWith('</svg>")')).toBe(true);
    expect(layer).not.toContain("#");
  });
});
