import { batch } from "solid-js";
import {
  ActiveTimer,
  SessionIntent,
  SessionPlatform,
  SessionTarget,
} from "@src/dataInterface/syncData";
import type { FrictionLevel } from "@src/shared/components/interaction/interactionContext";

type Setter<T> = (value: T) => unknown;

export const advanceIntentSelectionToTime = (
  intent: SessionIntent | undefined,
  setPendingIntent: Setter<SessionIntent | undefined>,
  setShowIntentSelection: Setter<boolean>,
  setShowTimeSelection: Setter<boolean>,
) => {
  batch(() => {
    setPendingIntent(intent);
    setShowTimeSelection(true);
    setShowIntentSelection(false);
  });
};

export const cancelIntentSelection = (
  setPendingIntent: Setter<SessionIntent | undefined>,
  setShowIntentSelection: Setter<boolean>,
) => {
  batch(() => {
    setPendingIntent(undefined);
    setShowIntentSelection(false);
  });
};

export const cancelTimeSelection = (
  setPendingIntent: Setter<SessionIntent | undefined>,
  setShowTimeSelection: Setter<boolean>,
) => {
  batch(() => {
    setPendingIntent(undefined);
    setShowTimeSelection(false);
  });
};

export const shouldAskIntent = (frictionLevel: FrictionLevel): boolean =>
  frictionLevel !== "soft";

export const getSessionEndTS = (seconds: number, now: number): number => {
  if (seconds >= 0) {
    return now + seconds * 1000;
  }

  const endOfDay = new Date(now);
  endOfDay.setHours(24, 0, 0, 0);
  return endOfDay.getTime();
};

export const createActiveTimer = (params: {
  seconds: number;
  now: number;
  target: SessionTarget;
  platform: SessionPlatform;
  intent?: SessionIntent;
}): ActiveTimer => ({
  endTS: getSessionEndTS(params.seconds, params.now),
  durationS: params.seconds,
  startedTS: params.now,
  target: params.target,
  platform: params.platform,
  ...(params.intent ? { intent: params.intent } : {}),
});

export const createAndroidSessionLimitPayload = (
  seconds: number,
  intent?: SessionIntent,
): string =>
  JSON.stringify({
    seconds,
    ...(intent ? { intent } : {}),
  });
