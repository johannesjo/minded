export enum MoodCheckinVal {
  Great = "Great",
  Good = "Good",
  Okay = "Okay",
  Bad = "Bad",
  Awful = "Awful",
}

export interface MoodCheckinOption {
  id: MoodCheckinVal;
  txt: string;
}

export const MOOD_CHECKIN_OPTIONS = [
  {
    id: MoodCheckinVal.Great,
    txt: "Great",
  },
  {
    id: MoodCheckinVal.Good,
    txt: "Good",
  },
  {
    id: MoodCheckinVal.Okay,
    txt: "Okay",
  },
  {
    id: MoodCheckinVal.Bad,
    txt: "Bad",
  },
  {
    id: MoodCheckinVal.Awful,
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
