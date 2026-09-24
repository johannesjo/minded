import { createMockSyncData } from "@src/test-utils/mockHelpers";
import type { InterventionPause } from "@src/dataInterface/syncData";
import { resolveSettingsSnapshot } from "./settingsHydration";

const WEEK = 7 * 24 * 60 * 60 * 1000;

const snapshotWith = (interventionPause: InterventionPause | null) =>
  resolveSettingsSnapshot(
    async () => ({ ...createMockSyncData(), interventionPause }),
    "web",
  );

describe("resolveSettingsSnapshot - skip check-in week", () => {
  it("hands a standing 'later' or 'off' week to the settings line", async () => {
    for (const kind of ["later", "off"] as const) {
      const pause = { kind, untilTS: Date.now() + WEEK };
      expect((await snapshotWith(pause)).interventionPause).toEqual(pause);
    }
  });

  it("shows nothing for 'as it does now' - it changes nothing to resume", async () => {
    const pause = { kind: "as_now" as const, untilTS: Date.now() + WEEK };
    expect((await snapshotWith(pause)).interventionPause).toBeNull();
  });

  it("shows nothing once the week is over", async () => {
    const pause = { kind: "off" as const, untilTS: Date.now() - 1 };
    expect((await snapshotWith(pause)).interventionPause).toBeNull();
  });
});
