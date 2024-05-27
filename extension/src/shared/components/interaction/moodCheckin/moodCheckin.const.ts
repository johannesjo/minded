export enum MoodCheckinVal {
  Great = "Great",
  Good = "Good",
  Okay = "Okay",
  Bad = "Bad",
  Awful = "Awful",
}

export interface MoodCheckinOption {
  val: MoodCheckinVal;
  txt: string;
}

export const MOOD_CHECKIN_OPTIONS: MoodCheckinOption[] = [
  {
    val: MoodCheckinVal.Great,
    txt: "Great",
  },
  {
    val: MoodCheckinVal.Good,
    txt: "Good",
  },
  {
    val: MoodCheckinVal.Okay,
    txt: "Okay",
  },
  {
    val: MoodCheckinVal.Bad,
    txt: "Bad",
  },
  {
    val: MoodCheckinVal.Awful,
    txt: "Awful",
  },
] as const;

export const MOOD_CHECKIN_FEEL_BETTER_OPTIONS = [
  "Take a short walk!",
  "Take a short break!",
  "Do a short meditation!",
  "Just be kind to yourself!",
  "Call a friend!",
] as const;
