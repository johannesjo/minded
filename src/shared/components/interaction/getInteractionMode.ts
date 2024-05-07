import { getRndInt } from "@src/util/getRndInt";
import {
  ACTION_ADVICES_MAX_HOUR,
  ACTION_ADVICES_MIN_HOUR,
} from "@src/shared/data/actionAdvices";
import { SyncData } from "@src/shared/data/syncData";
import { isToday } from "@src/util/isToday";

export type InteractionMode =
  | "RATING"
  | "ACTION_ADVICE"
  | "QUESTION"
  | "MOOD_CHECKIN";

export const getInteractionMode = (syncData: SyncData): InteractionMode => {
  // | "EMOJI_CHECKIN";
  // return "MOOD_CHECKIN";

  const now = new Date();
  const nowHours = now.getHours();

  const rndInt = getRndInt(0, 100);
  if (rndInt >= 95) {
    return "RATING";
  }
  if (
    rndInt >= 85 ||
    (!isToday(syncData.lastMoodCheckTS || 99) && rndInt >= 55)
  ) {
    return "MOOD_CHECKIN";
  }
  if (
    rndInt >= 80 &&
    nowHours < ACTION_ADVICES_MAX_HOUR &&
    nowHours >= ACTION_ADVICES_MIN_HOUR
  ) {
    return "ACTION_ADVICE";
  }
  return "QUESTION";
};
