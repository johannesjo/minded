import type { Alternative } from "@src/dataInterface/syncData";
import {
  getAlternativeCandidate,
  getNextAlternativeCandidate,
} from "./getAlternativeCandidate";

const NOW = new Date("2026-05-11T10:00:00").getTime();

const alternative = (overrides: Partial<Alternative>): Alternative => ({
  id: "base",
  kind: "website",
  label: "Base",
  url: "https://base.example",
  createdTS: 100,
  shownCount: 0,
  dismissedCount: 0,
  openedCount: 0,
  ...overrides,
});

describe("getAlternativeCandidate", () => {
  it("returns undefined when there are no enabled alternatives", () => {
    expect(getAlternativeCandidate([], { now: NOW })).toBeUndefined();
    expect(
      getAlternativeCandidate(
        [
          alternative({
            id: "disabled",
            disabledTS: NOW,
          }),
        ],
        { now: NOW },
      ),
    ).toBeUndefined();
  });

  it("prefers opened alternatives", () => {
    const opened = alternative({
      id: "opened",
      label: "Opened",
      openedCount: 2,
    });
    const untouched = alternative({
      id: "untouched",
      label: "Untouched",
    });

    expect(getAlternativeCandidate([untouched, opened], { now: NOW })?.id).toBe(
      "opened",
    );
  });

  it("penalizes dismissed alternatives", () => {
    const dismissed = alternative({
      id: "dismissed",
      label: "Dismissed",
      dismissedCount: 2,
    });
    const untouched = alternative({
      id: "untouched",
      label: "Untouched",
    });

    expect(
      getAlternativeCandidate([dismissed, untouched], { now: NOW })?.id,
    ).toBe("untouched");
  });

  it("penalizes recently shown alternatives", () => {
    const recentlyShown = alternative({
      id: "recently-shown",
      label: "Recently shown",
      lastShownTS: NOW - 60 * 1000,
    });
    const older = alternative({
      id: "older",
      label: "Older",
      lastShownTS: NOW - 24 * 60 * 60 * 1000,
    });

    expect(
      getAlternativeCandidate([recentlyShown, older], { now: NOW })?.id,
    ).toBe("older");
  });

  it("uses injected randomness for score ties", () => {
    const first = alternative({ id: "first", label: "First" });
    const second = alternative({ id: "second", label: "Second" });
    const randomValues = [0.75, 0.25];

    expect(
      getAlternativeCandidate([first, second], {
        now: NOW,
        random: () => randomValues.shift() ?? 0.99,
      })?.id,
    ).toBe("second");
  });

  it("can select a replacement candidate excluding the current one", () => {
    const current = alternative({ id: "current", label: "Current" });
    const replacement = alternative({
      id: "replacement",
      label: "Replacement",
    });

    expect(
      getNextAlternativeCandidate([current, replacement], "current", {
        now: NOW,
      })?.id,
    ).toBe("replacement");
  });
});
