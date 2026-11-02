import {
  ActiveTimer,
  SessionPlatform,
  SessionTarget,
} from "@src/dataInterface/syncData";

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
}): ActiveTimer => ({
  endTS: getSessionEndTS(params.seconds, params.now),
  durationS: params.seconds,
  startedTS: params.now,
  target: params.target,
  platform: params.platform,
});

export const createAndroidSessionLimitPayload = (seconds: number): string =>
  JSON.stringify({ seconds });
