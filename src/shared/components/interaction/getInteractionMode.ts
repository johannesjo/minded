import {
  ACTION_ADVICES_MAX_HOUR,
  ACTION_ADVICES_MIN_HOUR,
} from "@src/shared/data/actionAdvices";
import { SyncData } from "@src/shared/data/syncData";
import { isToday } from "@src/util/isToday";
import { isXIn1 } from "@src/util/isXIn1";

const LAST_MOOD_CHECKIN_MIN_GAP = 30 * 60 * 1000;
const LAST_ENERGY_LVL_CHECKIN_MIN_GAP = 30 * 60 * 1000;

export type InteractionMode =
  | "ENERGY_LVL"
  | "ACTION_ADVICE"
  | "EMOJI_CHECKIN"
  | "QUESTION"
  | "MOOD_CHECKIN";

export const getInteractionMode = (syncData: SyncData): InteractionMode => {
  // return "ACTION_ADVICE";
  return "MOOD_CHECKIN";
  // return "ENERGY_LVL";
  // return "EMOJI_CHECKIN";

  const now = new Date();
  const nowHours = now.getHours();

  if (
    (!isToday(syncData.moodCheckTS) && isXIn1(0.4)) ||
    (Date.now() - syncData.moodCheckTS > LAST_MOOD_CHECKIN_MIN_GAP &&
      isXIn1(0.1))
  ) {
    return "MOOD_CHECKIN";
  }

  if (
    Date.now() - syncData.moodCheckTS > LAST_ENERGY_LVL_CHECKIN_MIN_GAP &&
    isXIn1(0.05)
  ) {
    return "ENERGY_LVL";
  }

  if (
    nowHours < ACTION_ADVICES_MAX_HOUR &&
    nowHours >= ACTION_ADVICES_MIN_HOUR &&
    isXIn1(0.1)
  ) {
    return "ACTION_ADVICE";
  }
  if (isXIn1(0.01)) {
    return "EMOJI_CHECKIN";
  }
  return "QUESTION";
};
