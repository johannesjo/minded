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
 * **Timezone behavior:** Times are interpreted in the user's local timezone.
 * If the user travels across timezones, the schedule automatically adjusts
 * to local time (e.g., "09:00" means 9 AM wherever the user currently is).
 * This is intentional - focus hours should align with the user's current
 * daily rhythm, not their home timezone.
 *
 * @param schedule - Focus schedule with times in "HH:MM" format (local time)
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
