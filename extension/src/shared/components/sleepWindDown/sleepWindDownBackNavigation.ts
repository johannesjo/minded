export type SleepWindDownViewName =
  | "prompt"
  | "menu"
  | "brainDump"
  | "gratitude"
  | "tomorrow"
  | "mood"
  | "breathing"
  | "calmRead"
  | "tips"
  | "snoozeIntent"
  | "snoozeGoodnight"
  | "goodnight";

export const WIND_DOWN_OVERVIEW_VIEW: SleepWindDownViewName = "menu";

const VIEWS_THAT_BACK_TO_OVERVIEW: ReadonlySet<SleepWindDownViewName> = new Set(
  [
    "brainDump",
    "gratitude",
    "tomorrow",
    "mood",
    "breathing",
    "calmRead",
    "tips",
    "snoozeIntent",
    "snoozeGoodnight",
    "goodnight",
  ],
);

export const shouldBackReturnToWindDownOverview = (
  view: SleepWindDownViewName,
): boolean => VIEWS_THAT_BACK_TO_OVERVIEW.has(view);

export const shouldUseWindDownHistoryBackForBottomBar = (
  pathname: string,
): boolean => pathname === "/sleepWindDown";
