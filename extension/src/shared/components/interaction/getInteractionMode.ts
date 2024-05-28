import {
  ACTION_ADVICES_MAX_HOUR,
  ACTION_ADVICES_MIN_HOUR,
} from "@src/shared/data/actionAdvices";
import { SyncData } from "@src/dataInterface/syncData";
import { hasHappenedInLastXDay, isToday } from "@src/util/isToday";
import { isXIn1 } from "@src/util/isXIn1";
// @ts-expect-error
import { IS_ANDROID } from "@dataInterface/isAndroid";

const LAST_MOOD_CHECKIN_MIN_GAP = 2 * 60 * 60 * 1000;
const TODAY_START_HOUR = 5;
const ENERGY_LVL_MAX_HOURS = 19;

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
  return "SELF_REFLECTION_RATING";

  const now = new Date();
  const nowTS = Date.now();
  const nowHours = now.getHours();

  // always return question if never answered any
  if (syncData.answers.length <= 1) {
    return "QUESTION";
  }

  if (isXIn1(1 / 10)) {
    return "SELF_REFLECTION_RATING";
  }

  if (
    (!isToday(syncData.moodCheckTS) && isXIn1(2 / 5)) ||
    (nowTS - syncData.moodCheckTS > LAST_MOOD_CHECKIN_MIN_GAP && isXIn1(1 / 50))
  ) {
    return "MOOD_CHECKIN";
  }

  if (
    nowHours >= TODAY_START_HOUR &&
    nowHours < ENERGY_LVL_MAX_HOURS &&
    !isToday(syncData.energyLvlTS) &&
    isXIn1(1 / 3)
  ) {
    return "ENERGY_LVL";
  }

  const rTS = IS_ANDROID
    ? syncData.lastAppUsageRatingTS
    : syncData.lastBrowsingBehaviorRatingTS;
  if (
    (!hasHappenedInLastXDay(rTS, 2) && isXIn1(0.5)) ||
    (!isToday(rTS) && isXIn1(1 / 20))
  ) {
    return "APP_USAGE_OR_BROWSING_BEHAVIOR";
  }

  if (
    nowHours < ACTION_ADVICES_MAX_HOUR &&
    nowHours >= ACTION_ADVICES_MIN_HOUR &&
    isXIn1(1 / 20)
  ) {
    return "ACTION_ADVICE";
  }

  if (isXIn1(1 / 100)) {
    return "EMOJI_CHECKIN";
  }

  return "QUESTION";
};
