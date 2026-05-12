import type { Alternative } from "@src/dataInterface/syncData";

const HTTP_URL_PATTERN = /^https?:\/\//i;
const HOST_WITH_PORT_PATTERN =
  /^(localhost|(?:[a-z0-9-]+\.)+[a-z0-9-]+|(?:\d{1,3}\.){3}\d{1,3}):\d+(?:\/.*)?$/i;
const DISALLOWED_URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

export const getAlternativeOpenUrl = (
  alternative: Alternative | undefined,
): string | undefined => {
  if (alternative?.kind !== "website" || !alternative.url) {
    return undefined;
  }

  const url = alternative.url.trim();
  if (!url) {
    return undefined;
  }

  if (HTTP_URL_PATTERN.test(url)) {
    return url;
  }

  if (HOST_WITH_PORT_PATTERN.test(url)) {
    return `https://${url}`;
  }

  if (DISALLOWED_URL_SCHEME_PATTERN.test(url)) {
    return undefined;
  }

  return `https://${url}`;
};
