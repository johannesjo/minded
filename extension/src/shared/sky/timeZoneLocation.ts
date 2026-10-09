import { TIME_ZONE_COORDINATES_PACKED } from "./timeZoneCoordinates";

/**
 * Roughly where the user is, read from the IANA time zone alone - no location
 * permission, no network. The zone's principal city stands in for the user:
 * close enough for the sky (a zone is a few degrees wide; a degree of longitude
 * moves the sun by four minutes), and wrong only in the honest way a wide zone
 * is (all of China on Asia/Shanghai). Unknown zones - UTC, Etc/*, anything the
 * table lacks - return null, and the sky falls back to the fixed clock.
 */

export type LatLon = { lat: number; lon: number };

let table: Map<string, LatLon> | null = null;
const getTable = (): Map<string, LatLon> => {
  if (!table) {
    table = new Map();
    for (const entry of TIME_ZONE_COORDINATES_PACKED.split(";")) {
      const [zone, lat, lon] = entry.split(",");
      table.set(zone, { lat: Number(lat), lon: Number(lon) });
    }
  }
  return table;
};

export const locationForTimeZone = (
  zone: string | null | undefined,
): LatLon | null => (zone ? (getTable().get(zone) ?? null) : null);

/** The runtime's own zone, or null if the engine can't say. */
export const currentTimeZone = (): string | null => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
};
