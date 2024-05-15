import {
  ACTION_ADVICES_MAX_HOUR,
  ACTION_ADVICES_MIN_HOUR,
} from "@src/shared/data/actionAdvices";
import { SyncData } from "@src/dataInterface/syncData";
import { hasHappenedInLastXDay, isToday } from "@src/util/isToday";
import { isXIn1 } from "@src/util/isXIn1";

const LAST_MOOD_CHECKIN_MIN_GAP = 30 * 60 * 1000;
const LAST_ENERGY_LVL_CHECKIN_MIN_GAP = 30 * 60 * 1000;
const LAST_ENERGY_LVL_CHECKIN_BOOST_GAP = 12 * 60 * 60 * 1000;
const LAST_BROWSING_RATING_MIN_GAP = 8 * 60 * 1000;

export type InteractionMode =
  | "ENERGY_LVL"
  | "BROWSING_BEHAVIOR_RATING"
  | "ACTION_ADVICE"
  | "EMOJI_CHECKIN"
  | "QUESTION"
  | "MOOD_CHECKIN";

export const getInteractionMode = (syncData: SyncData): InteractionMode => {
  // return "BROWSING_BEHAVIOR_RATING";
  // return "ACTION_ADVICE";
  return "MOOD_CHECKIN";
  // return "ENERGY_LVL";
  // return "EMOJI_CHECKIN";

  const now = new Date();
  const nowTS = Date.now();
  const nowHours = now.getHours();

  if (
    (!isToday(syncData.moodCheckTS) && isXIn1(0.4)) ||
    (nowTS - syncData.moodCheckTS > LAST_MOOD_CHECKIN_MIN_GAP && isXIn1(0.1))
  ) {
    return "MOOD_CHECKIN";
  }

  if (
    (nowTS - syncData.energyLvlTS > LAST_ENERGY_LVL_CHECKIN_BOOST_GAP &&
      isXIn1(0.3)) ||
    (nowTS - syncData.energyLvlTS > LAST_ENERGY_LVL_CHECKIN_MIN_GAP &&
      isXIn1(0.05))
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

  if (
    (!hasHappenedInLastXDay(syncData.lastBrowsingBehaviorRatingTS, 2) &&
      isXIn1(0.5)) ||
    (nowTS - syncData.lastBrowsingBehaviorRatingTS >
      LAST_BROWSING_RATING_MIN_GAP &&
      isXIn1(0.1))
  ) {
    return "BROWSING_BEHAVIOR_RATING";
  }

  return "QUESTION";
};
