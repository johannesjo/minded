import type { SunSettle } from "./Sun";
import { sunArriveSettleAt } from "./sunSettle";

/**
 * The home-screen widget's sun, as the native shell saw it at the tap
 * (`&sunFrom=x,y,d` in the launch hash): its centre as fractions of the display
 * (the WebView is edge-to-edge, so these map 1:1 onto the viewport - the same
 * convention as the Little Sun's getLittleSunRestCenter) and its disc diameter
 * in dp (== CSS px). Returns the arriving settle that puts the shell disc's first
 * paint exactly there (sunArriveSettleAt: white halo - it is arriving onto our
 * own sky), or null for anything malformed, so a bad value just falls back to
 * the companion rise. Native sends three plain decimals; nothing else passes.
 */
export const parseWidgetSunFrom = (raw: unknown): SunSettle | null => {
  if (typeof raw !== "string") return null;
  const parts = raw.split(",");
  if (parts.length !== 3) return null;
  const [x, y, d] = parts.map((p) =>
    /^\d+(\.\d+)?$/.test(p) ? Number(p) : NaN,
  );
  if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) return null;
  // A widget disc is tens of dp; anything outside a sane band is not one.
  if (!(d >= MIN_DISC_PX && d <= MAX_DISC_PX)) return null;
  return sunArriveSettleAt({ x, y }, d);
};

const MIN_DISC_PX = 8;
const MAX_DISC_PX = 400;
