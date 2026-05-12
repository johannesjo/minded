import type { Alternative } from "@src/dataInterface/syncData";
import {
  ALTERNATIVE_DISABLE_DISMISSAL_COUNT,
  applyAlternativeDisabled,
  applyAlternativeStatEvent,
} from "./alternativeStats";

const NOW = new Date("2026-05-11T10:00:00").getTime();

const alternative = (overrides: Partial<Alternative> = {}): Alternative => ({
  id: "alt",
  kind: "website",
  label: "Example",
  url: "https://example.com",
  createdTS: 100,
  shownCount: 0,
  dismissedCount: 0,
  openedCount: 0,
  ...overrides,
});

describe("alternative stats", () => {
  it("inserts legacy fallback alternatives before applying shown stats", () => {
    expect(
      applyAlternativeStatEvent(undefined, alternative(), "shown", NOW),
    ).toEqual([
      {
        ...alternative(),
        lastShownTS: NOW,
        shownCount: 1,
      },
    ]);
  });

  it("updates existing alternatives without dropping unrelated entries", () => {
    const target = alternative({ id: "target" });
    const other = alternative({
      id: "other",
      label: "Other",
      url: "https://other.example",
    });

    expect(
      applyAlternativeStatEvent([target, other], target, "opened", NOW),
    ).toEqual([
      {
        ...target,
        openedCount: 1,
      },
      other,
    ]);
  });

  it("disables alternatives on the configured dismissal threshold", () => {
    const target = alternative({
      dismissedCount: ALTERNATIVE_DISABLE_DISMISSAL_COUNT - 1,
    });

    expect(
      applyAlternativeStatEvent([target], target, "dismissed", NOW),
    ).toEqual([
      {
        ...target,
        dismissedCount: ALTERNATIVE_DISABLE_DISMISSAL_COUNT,
        disabledTS: NOW,
      },
    ]);
  });

  it("can explicitly disable an alternative", () => {
    expect(applyAlternativeDisabled(undefined, alternative(), NOW)).toEqual([
      {
        ...alternative(),
        disabledTS: NOW,
      },
    ]);
  });

  it("does not overwrite an existing disabled timestamp", () => {
    const disabledTS = NOW - 1000;
    const target = alternative({
      disabledTS,
    });

    expect(applyAlternativeDisabled([target], target, NOW)).toEqual([target]);
  });
});
