import type {
  Alternative,
  SessionPlatform,
  SessionTarget,
  SyncData,
} from "@src/dataInterface/syncData";

const LEGACY_CREATED_TS = 0;

export const beautifyAlternativeUrl = (url: string): string => {
  const trimmed = url.trim();
  return trimmed
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
};

export const isWebsiteAlternativeScope = (
  target?: SessionTarget,
  platform?: SessionPlatform,
): boolean =>
  target?.kind === "host" || (!target && (!platform || platform === "web"));

export const legacyWebsiteToAlternative = (url: string): Alternative => ({
  id: `legacy-web:${url}`,
  kind: "website",
  label: beautifyAlternativeUrl(url) || url,
  url,
  createdTS: LEGACY_CREATED_TS,
  shownCount: 0,
  dismissedCount: 0,
  openedCount: 0,
});

export const legacyAppToAlternative = (label: string): Alternative => ({
  id: `legacy-app:${label}`,
  kind: "app",
  label,
  createdTS: LEGACY_CREATED_TS,
  shownCount: 0,
  dismissedCount: 0,
  openedCount: 0,
});

export const createUserWebsiteAlternative = (
  url: string,
  createdTS = Date.now(),
): Alternative => {
  const trimmedUrl = url.trim();

  return {
    id: `legacy-web:${trimmedUrl}`,
    kind: "website",
    label: beautifyAlternativeUrl(trimmedUrl) || trimmedUrl,
    url: trimmedUrl,
    createdTS,
    shownCount: 0,
    dismissedCount: 0,
    openedCount: 0,
  };
};

export const createUserAppAlternative = (
  label: string,
  createdTS = Date.now(),
): Alternative => {
  const trimmedLabel = label.trim();

  return {
    id: `legacy-app:${trimmedLabel}`,
    kind: "app",
    label: trimmedLabel,
    createdTS,
    shownCount: 0,
    dismissedCount: 0,
    openedCount: 0,
  };
};

const isAlternativeInScope = (
  alternative: Alternative,
  isWebsiteScope: boolean,
): boolean => {
  if (alternative.kind === "activity" || alternative.kind === "custom") {
    return true;
  }

  return isWebsiteScope
    ? alternative.kind === "website"
    : alternative.kind === "app";
};

export const getAlternativesForTarget = (
  syncData: SyncData,
  target?: SessionTarget,
  platform?: SessionPlatform,
): Alternative[] => {
  const isWebsiteScope = isWebsiteAlternativeScope(target, platform);
  const structuredAlternatives = (syncData.alternatives ?? []).filter(
    (alternative) => isAlternativeInScope(alternative, isWebsiteScope),
  );
  const legacyAlternatives = isWebsiteScope
    ? syncData.alternativeWebsites.map(legacyWebsiteToAlternative)
    : syncData.alternativeApps.map(legacyAppToAlternative);
  const structuredIds = new Set(
    structuredAlternatives.map((alternative) => alternative.id),
  );

  return [
    ...structuredAlternatives,
    ...legacyAlternatives.filter(
      (alternative) => !structuredIds.has(alternative.id),
    ),
  ];
};
