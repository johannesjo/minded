import type { Alternative } from "@src/dataInterface/syncData";

export const ALTERNATIVE_DISABLE_DISMISSAL_COUNT = 3;

export type AlternativeStatEvent = "shown" | "opened" | "dismissed";

const applyStatEventToAlternative = (
  alternative: Alternative,
  event: AlternativeStatEvent,
  now: number,
): Alternative => {
  switch (event) {
    case "shown":
      return {
        ...alternative,
        lastShownTS: now,
        shownCount: alternative.shownCount + 1,
      };
    case "opened":
      return {
        ...alternative,
        openedCount: alternative.openedCount + 1,
      };
    case "dismissed": {
      const dismissedCount = alternative.dismissedCount + 1;
      return {
        ...alternative,
        dismissedCount,
        ...(dismissedCount >= ALTERNATIVE_DISABLE_DISMISSAL_COUNT &&
        alternative.disabledTS === undefined
          ? { disabledTS: now }
          : {}),
      };
    }
  }
};

export const applyAlternativeStatEvent = (
  alternatives: Alternative[] | undefined,
  alternative: Alternative,
  event: AlternativeStatEvent,
  now: number,
): Alternative[] => {
  const currentAlternatives = alternatives ?? [];
  let didUpdate = false;
  const updatedAlternatives = currentAlternatives.map((existingAlternative) => {
    if (existingAlternative.id !== alternative.id) {
      return existingAlternative;
    }

    didUpdate = true;
    return applyStatEventToAlternative(existingAlternative, event, now);
  });

  return didUpdate
    ? updatedAlternatives
    : [
        ...updatedAlternatives,
        applyStatEventToAlternative(alternative, event, now),
      ];
};

export const applyAlternativeDisabled = (
  alternatives: Alternative[] | undefined,
  alternative: Alternative,
  now: number,
): Alternative[] => {
  const currentAlternatives = alternatives ?? [];
  let didUpdate = false;
  const updatedAlternatives = currentAlternatives.map((existingAlternative) => {
    if (existingAlternative.id !== alternative.id) {
      return existingAlternative;
    }

    didUpdate = true;
    return {
      ...existingAlternative,
      disabledTS: existingAlternative.disabledTS ?? now,
    };
  });

  return didUpdate
    ? updatedAlternatives
    : [
        ...updatedAlternatives,
        {
          ...alternative,
          disabledTS: alternative.disabledTS ?? now,
        },
      ];
};
