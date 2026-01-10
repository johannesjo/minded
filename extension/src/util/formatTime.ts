/**
 * Format seconds into a human-readable time string.
 * Used by LittleSun component and extension badge.
 */
export function formatSessionTime(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  }
  if (seconds >= 30) {
    return "" + seconds;
  }
  return "";
}

/**
 * Format seconds for badge display (max 4 characters).
 * - Hours: "1h", "2h"
 * - 10+ minutes: "12m", "45m"
 * - Under 10 minutes: "5:30", "9:05"
 * - Under 1 minute: "45", "10"
 */
export function formatBadgeTime(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h`;
  }
  if (seconds >= 600) {
    // 10+ minutes: show just minutes
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  }
  if (seconds >= 60) {
    // Under 10 minutes: show MM:SS for precision
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  }
  if (seconds > 0) {
    return `${seconds}`;
  }
  return "";
}
