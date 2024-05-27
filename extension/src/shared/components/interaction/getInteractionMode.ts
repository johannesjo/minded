import {
  ACTION_ADVICES_MAX_HOUR,
  ACTION_ADVICES_MIN_HOUR,
} from "@src/shared/data/actionAdvices";
import { SyncData } from "@src/dataInterface/syncData";
import { hasHappenedInLastXDay, isToday } from "@src/util/isToday";
import { isXIn1 } from "@src/util/isXIn1";

const LAST_MOOD_CHECKIN_MIN_GAP = 60 * 60 * 1000;
const LAST_ENERGY_LVL_CHECKIN_MIN_GAP = 60 * 60 * 1000;
const LAST_ENERGY_LVL_CHECKIN_BOOST_GAP = 12 * 60 * 60 * 1000;
const LAST_BROWSING_RATING_MIN_GAP = 8 * 60 * 1000;
const ENERGY_LVL_MAX_HOURS = 19;

const SMALL_CHANCE = 0.1;
const TINY_CHANCE = 0.01;

export type InteractionMode =
  | "ENERGY_LVL"
  | "APP_USAGE_OR_BROWSING_BEHAVIOR"
  | "ACTION_ADVICE"
  | "EMOJI_CHECKIN"
  | "QUESTION"
  | "MOOD_CHECKIN"
  | "SELF_REFLECTION_RATING";

export const getInteractionMode = (syncData: SyncData): InteractionMode => {
  // return "APP_USAGE_OR_BROWSING_BEHAVIOR";
  // return "ACTION_ADVICE";
  // return "MOOD_CHECKIN";
  // return "ENERGY_LVL";
  // return "EMOJI_CHECKIN";
  // return "SELF_REFLECTION_RATING";

  const now = new Date();
  const nowTS = Date.now();
  const nowHours = now.getHours();

  // always return question if never answered any
  if (syncData.answers.length <= 1) {
    return "QUESTION";
  }

  if (isXIn1(SMALL_CHANCE)) {
    return "SELF_REFLECTION_RATING";
  }

  if (
    (!isToday(syncData.moodCheckTS) && isXIn1(0.4)) ||
    (nowTS - syncData.moodCheckTS > LAST_MOOD_CHECKIN_MIN_GAP &&
      isXIn1(TINY_CHANCE))
  ) {
    return "MOOD_CHECKIN";
  }

  if (
    nowHours < ENERGY_LVL_MAX_HOURS &&
    ((nowTS - syncData.energyLvlTS > LAST_ENERGY_LVL_CHECKIN_BOOST_GAP &&
      isXIn1(0.3)) ||
      (nowTS - syncData.energyLvlTS > LAST_ENERGY_LVL_CHECKIN_MIN_GAP &&
        isXIn1(TINY_CHANCE)))
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
      isXIn1(TINY_CHANCE))
  ) {
    return "APP_USAGE_OR_BROWSING_BEHAVIOR";
  }

  return "QUESTION";
};
