import { safeJsonParse } from "@src/util/safeJsonParse";

/** The last due bell, as the native side records it (MindfulnessBell.recordCheck). */
interface BellLastCheck {
  atMs: number;
  rang: boolean;
  reason: string | null;
  /** The sun it rang through when one was already there, e.g. "the Little Sun". */
  through: string | null;
}

const parse = (raw: string | null | undefined): BellLastCheck | undefined => {
  const v = raw ? safeJsonParse<Partial<BellLastCheck>>(raw) : undefined;
  return v && typeof v.atMs === "number" && typeof v.rang === "boolean"
    ? {
        atMs: v.atMs,
        rang: v.rang,
        reason: v.reason ?? null,
        through: v.through ?? null,
      }
    : undefined;
};

/**
 * One line saying what the last due bell did - rang, or why it stayed quiet -
 * so a bell that's never heard can be understood. Undefined when no bell has
 * been due yet (or the native build can't tell).
 */
const timeOf = (at: Date): string =>
  at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const whenOf = (atMs: number, now: Date): string => {
  const at = new Date(atMs);
  return at.toDateString() === now.toDateString()
    ? `today ${timeOf(at)}`
    : `${at.toLocaleDateString([], { month: "short", day: "numeric" })} ${timeOf(at)}`;
};

export const bellLastCheckLabel = (
  raw: string | null | undefined,
  now: Date = new Date(),
): string | undefined => {
  const check = parse(raw);
  if (!check) return undefined;
  const when = whenOf(check.atMs, now);
  return check.rang
    ? `Last bell: ${when}, rang${check.through ? ` through ${check.through}` : ""}`
    : `Last bell: ${when}, stayed quiet - ${check.reason ?? "the moment wasn't right"}`;
};
