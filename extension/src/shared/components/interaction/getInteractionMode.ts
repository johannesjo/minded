import {
  ACTION_ADVICES_MAX_HOUR,
  ACTION_ADVICES_MIN_HOUR,
} from "@src/shared/data/actionAdvices";
import { SyncData } from "@src/dataInterface/syncData";
import { hasHappenedInLastXDay, isToday } from "@src/util/isToday";
import { isXIn1 } from "@src/util/isXIn1";
import { IS_ANDROID, IS_APP } from "@src/dataInterface/commonSyncDataInterface";
import { isMain } from "@src/shared/isMain.const";

const LAST_MOOD_CHECKIN_MIN_GAP = 2 * 60 * 60 * 1000;
const TODAY_START_HOUR = 5;
const ENERGY_LVL_MAX_HOURS = 19;

export type InteractionMode =
  | "ENERGY_LVL"
  | "APP_USAGE_OR_BROWSING_BEHAVIOR"
  | "ACTION_ADVICE"
  | "EMOJI_CHECKIN"
  | "QUESTION"
  | "SHOW_ALTERNATIVE"
  | "SET_ALTERNATIVE"
  | "MOOD_CHECKIN"
  | "SELF_ASSESSMENT";

export const getInteractionMode = (syncData: SyncData): InteractionMode => {
  // return "APP_USAGE_OR_BROWSING_BEHAVIOR";
  // return "ACTION_ADVICE";
  // return "MOOD_CHECKIN";
  // return "ENERGY_LVL";
  // return "EMOJI_CHECKIN";
  // return "SELF_ASSESSMENT";
  // return "SHOW_ALTERNATIVE";
  // return "SET_ALTERNATIVE";

  const now = new Date();
  const nowTS = Date.now();
  const nowHours = now.getHours();

  // always return question if never answered any
  if (syncData.answers.length <= 1) {
    return "QUESTION";
  }

  if (isXIn1(1 / 10)) {
    return "SELF_ASSESSMENT";
  }

  if (
    (!isToday(syncData.moodCheckTS) && isXIn1(1 / 3)) ||
    (nowTS - syncData.moodCheckTS > LAST_MOOD_CHECKIN_MIN_GAP && isXIn1(1 / 50))
  ) {
    return "MOOD_CHECKIN";
  }

  if (!isMain() && isXIn1(1 / 10)) {
    const alternativeToCheck = IS_APP
      ? syncData.alternativeApps
      : syncData.alternativeWebsites;
    if (alternativeToCheck.length >= 3 && isXIn1(9 / 10)) {
      return "SHOW_ALTERNATIVE";
    }
    if (alternativeToCheck.length >= 1 && isXIn1(4 / 5)) {
      return "SHOW_ALTERNATIVE";
    }
    return "SET_ALTERNATIVE";
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
    (!hasHappenedInLastXDay(rTS, 2) && isXIn1(1 / 3)) ||
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
