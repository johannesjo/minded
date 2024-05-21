export interface BrowsingBehaviorOption {
  val: number;
  txt: string;
}

export const BROWSING_BEHAVIOR_OPTIONS: BrowsingBehaviorOption[] = [
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
