import { TglBtnOption } from "@src/shared/components/ui/TglBtns";

export enum SleepMoodVal {
  Tired = "Tired",
  Anxious = "Anxious",
  Content = "Content",
  Wired = "Wired",
}

export const SLEEP_MOOD_OPTIONS: TglBtnOption<SleepMoodVal>[] = [
  { val: SleepMoodVal.Tired, txt: "Tired" },
  { val: SleepMoodVal.Anxious, txt: "Anxious" },
  { val: SleepMoodVal.Content, txt: "Content" },
  { val: SleepMoodVal.Wired, txt: "Wired" },
] as const;
