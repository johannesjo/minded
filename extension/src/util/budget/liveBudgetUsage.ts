import { LiveBudgetUsageEntry } from "@src/dataInterface/localData";
import { SyncData } from "@src/dataInterface/syncData";
import { bro } from "@src/util/browser";
import { getIsoDate } from "@src/util/getIsoDate";

const LIVE_BUDGET_USAGE_KEY_PREFIX = "mindedLiveBudgetUsage:";

const getLiveBudgetUsageKey = (sessionId: string): string =>
  `${LIVE_BUDGET_USAGE_KEY_PREFIX}${sessionId}`;

const isLiveBudgetUsageEntry = (
  value: unknown,
): value is LiveBudgetUsageEntry => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Partial<LiveBudgetUsageEntry>;
  return (
    typeof entry.dateISO === "string" &&
    typeof entry.host === "string" &&
    typeof entry.seconds === "number" &&
    typeof entry.updatedTS === "number"
  );
};

export const getLiveBudgetUsageEntries = async (): Promise<
  Record<string, LiveBudgetUsageEntry>
> => {
  const data = await bro.storage.local.get();

  return Object.entries(data).reduce<Record<string, LiveBudgetUsageEntry>>(
    (acc, [key, value]) => {
      if (
        key.startsWith(LIVE_BUDGET_USAGE_KEY_PREFIX) &&
        isLiveBudgetUsageEntry(value)
      ) {
        acc[key.slice(LIVE_BUDGET_USAGE_KEY_PREFIX.length)] = value;
      }
      return acc;
    },
    {},
  );
};

export const setLiveBudgetUsage = async (
  sessionId: string,
  host: string,
  seconds: number,
  now = Date.now(),
): Promise<void> => {
  const key = getLiveBudgetUsageKey(sessionId);
  const roundedSeconds = Math.max(0, Math.floor(seconds));

  if (roundedSeconds === 0) {
    await bro.storage.local.remove(key);
    return;
  }

  await bro.storage.local.set({
    [key]: {
      dateISO: getIsoDate(new Date(now)),
      host,
      seconds: roundedSeconds,
      updatedTS: now,
    } satisfies LiveBudgetUsageEntry,
  });
};

export const clearLiveBudgetUsage = (sessionId: string): Promise<void> =>
  bro.storage.local.remove(getLiveBudgetUsageKey(sessionId));

export const getLiveBudgetUsageSecondsForBudget = (
  syncData: SyncData,
  host: string,
  entries: Record<string, LiveBudgetUsageEntry>,
  now = Date.now(),
): number => {
  if (!syncData.dailyBudget) {
    return 0;
  }

  const today = getIsoDate(new Date(now));
  const isPerSiteBudget =
    syncData.dailyBudget.perSiteMinutes?.[host] !== undefined;

  return Object.values(entries).reduce((totalSeconds, entry) => {
    if (entry.dateISO !== today || entry.seconds <= 0) {
      return totalSeconds;
    }

    if (isPerSiteBudget && entry.host !== host) {
      return totalSeconds;
    }

    return totalSeconds + entry.seconds;
  }, 0);
};
