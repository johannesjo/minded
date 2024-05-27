export interface AppUsageOrBrowsingBehaviorOption {
  val: number;
  txt: string;
}

export const APP_USAGE_OR_BROWSING_BEHAVIOR_OPTIONS: AppUsageOrBrowsingBehaviorOption[] =
  [
    {
      val: 5,
      txt: "Great",
    },
    {
      val: 4,
      txt: "Good",
    },
    {
      val: 3,
      txt: "Okay",
    },
    {
      val: 2,
      txt: "Bad",
    },
    {
      val: 1,
      txt: "Awful",
    },
  ] as const;
