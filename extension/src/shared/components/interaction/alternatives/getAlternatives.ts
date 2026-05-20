import type {
  Alternative,
  SessionPlatform,
  SessionTarget,
  SyncData,
} from "@src/dataInterface/syncData";

const LEGACY_CREATED_TS = 0;
const HTTP_URL_PATTERN = /^https?:\/\//i;
const URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;
const HOST_WITH_PORT_PATTERN =
  /^(localhost|(?:[a-z0-9-]+\.)+[a-z0-9-]+|(?:\d{1,3}\.){3}\d{1,3}):\d+(?:[/?#].*)?$/i;

export const beautifyAlternativeUrl = (url: string): string => {
  const trimmed = url.trim();
  return trimmed
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
};

const toWebsiteHref = (url: string): string | undefined => {
  const trimmed = url.trim();
  const hasHttpScheme = HTTP_URL_PATTERN.test(trimmed);
  const hasHostPort = HOST_WITH_PORT_PATTERN.test(trimmed);
  const hasNonHttpScheme =
    URL_SCHEME_PATTERN.test(trimmed) && !hasHttpScheme && !hasHostPort;

  if (!trimmed || hasNonHttpScheme) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(hasHttpScheme ? trimmed : `https://${trimmed}`);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
      ? parsedUrl.href
      : undefined;
  } catch {
    return undefined;
  }
};

export const getWebsiteAlternativeHref = (
  alternative: Alternative,
): string | undefined =>
  alternative.kind === "website" && alternative.url
    ? toWebsiteHref(alternative.url)
    : undefined;

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
