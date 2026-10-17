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

/**
 * One line saying what the bell made of the last unlock - so "no unlock ever
 * reached the bell" can be told from "none fell inside a bell's window".
 * Undefined when the native build can't tell (raw undefined).
 */
export const bellLastUnlockLabel = (
  raw: string | null | undefined,
  now: Date = new Date(),
): string | undefined => {
  if (raw === undefined) return undefined;
  const v = raw
    ? safeJsonParse<{ atMs?: unknown; enabled?: unknown; nextAtMs?: unknown }>(
        raw,
      )
    : undefined;
  if (!v || typeof v.atMs !== "number") return "No unlock seen yet";
  const when = whenOf(v.atMs, now);
  if (v.enabled !== true) return `Last unlock: ${when}, the bell was off`;
  return typeof v.nextAtMs === "number"
    ? `Last unlock: ${when}, next bell from ${timeOf(new Date(v.nextAtMs))}`
    : `Last unlock: ${when}, no bell left today`;
};

// TEMPORARY diagnostic (no adb on hand): the unlock's way to the bell, in
// order - see SharedPreferenceService.traceMindfulnessBell. Remove with it.
const TRACE_STAGES = [
  "serviceUp",
  "screenOn",
  "a11y",
  "a11yLocked",
  "a11yEvent",
  "handOff",
  "started",
  "service",
  "check",
  "failed",
] as const;

/** One line listing when each traced step last ran, plus the last error. */
export const bellTraceLabel = (
  raw: string | null | undefined,
  now: Date = new Date(),
): string | undefined => {
  if (raw === undefined) return undefined;
  const v = raw ? safeJsonParse<Record<string, unknown>>(raw) : undefined;
  if (!v) return "Trace: nothing yet";
  const steps = TRACE_STAGES.map((stage) => {
    const at = v[stage];
    return `${stage} ${typeof at === "number" ? whenOf(at, now) : "-"}`;
  });
  const error = typeof v.error === "string" ? ` · error: ${v.error}` : "";
  return `Trace: ${steps.join(" · ")}${error}`;
};
