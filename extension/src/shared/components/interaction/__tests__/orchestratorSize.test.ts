import { readFileSync } from "fs";
import { join } from "path";

/**
 * A ratchet, not a target. InteractionCommon.tsx and Sun.tsx are the two
 * orchestrators every audit has flagged as too large, and both kept growing
 * anyway - every polish pass landed inside them. This test pins their current
 * size so a change can't quietly add to either: put new logic in a tested
 * helper module next to them (see interactionCommonHelpers.ts,
 * interactionCornerSettle.ts, sun/sunGeometry.ts, sun/sunGlow.ts). When a
 * change shrinks a file, lower its number here; never raise one.
 *
 * Follow-up extractions worth doing next: the mode/content selection and the
 * arrive-from-corner launcher in InteractionCommon; getSunCenterForOffset and
 * the progress-crown hold in Sun.
 */
// Each limit carries ~15 lines of headroom over the size at the time it was
// set, so a why-comment on a bug fix doesn't force an unrelated extraction
// into the same change; real growth still trips it.
const LIMITS: Record<string, number> = {
  "InteractionCommon.tsx": 1967,
  "sun/Sun.tsx": 1834,
};

// Counted like `wc -l` (newlines), so the numbers above match the shell.
const lineCount = (relPath: string): number =>
  (readFileSync(join(__dirname, "..", relPath), "utf8").match(/\n/g) ?? [])
    .length;

describe("orchestrator size ratchet", () => {
  it.each(Object.entries(LIMITS))(
    "%s stays at or under %i lines",
    (file, limit) => {
      expect(lineCount(file)).toBeLessThanOrEqual(limit);
    },
  );
});
