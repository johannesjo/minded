import type { MindfulnessBellPerDay } from "@src/dataInterface/syncData";

/** Mirrors MindfulnessBellSchedule.DEFAULT_SLOTS_PER_DAY. */
export const DEFAULT_BELL_PER_DAY: MindfulnessBellPerDay = 2;

export const BELL_PER_DAY_OPTIONS: ReadonlyArray<{
  value: MindfulnessBellPerDay;
  label: string;
}> = [
  { value: 1, label: "Once a day" },
  { value: 2, label: "Twice a day" },
  { value: 3, label: "Three times a day" },
];
