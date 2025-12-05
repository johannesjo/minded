import { FocusSchedule } from "@src/dataInterface/syncData";

/**
 * Parse time string "HH:MM" to minutes since midnight
 */
const parseTime = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * Check if current time falls within focus hours according to the schedule.
 * Returns true if blocking should be active.
 *
 * @param schedule - The focus schedule configuration
 * @param now - Optional date for testing (defaults to current time)
 */
export const isWithinFocusHours = (
  schedule: FocusSchedule | undefined,
  now: Date = new Date(),
): boolean => {
  // No schedule or schedule disabled = always block (current behavior)
  if (!schedule || !schedule.enabled) {
    return true;
  }

  const dayIndex = now.getDay(); // 0 = Sunday, 6 = Saturday
  const daySchedule = schedule.days[dayIndex];

  // No schedule for this day = don't block
  if (daySchedule === null || daySchedule === undefined) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTime(daySchedule.start);
  const endMinutes = parseTime(daySchedule.end);

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
};
