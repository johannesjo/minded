import { SyncData } from "@src/dataInterface/syncData";
import { isWithinFocusHours } from "@src/util/isWithinFocusHours";

export const isOnBlockedUrl = (
  currentUrl: string,
  syncData: SyncData,
): boolean => {
  const host = cleanHostWWW(new URL(currentUrl).host);
  const cfg = syncData.cfg;

  // Check if current time is within focus hours
  if (!isWithinFocusHours(cfg.focusSchedule)) {
    return false;
  }

  return !!cfg.blockedHosts.find((blockedHost) =>
    isMatchingHost(host, blockedHost),
  );
};
const cleanHostWWW = (host: string): string => {
  return host.replace(/^www\./, "");
};

const isMatchingHost = (currentHost: string, blockedHost: string): boolean => {
  const index = currentHost.indexOf(blockedHost);

  return (
    // e.g. tagesschau.de => tagesschau.de
    (index === 0 && currentHost.length === blockedHost.length) ||
    // e.g. tagesschau.de => sport.tagesschau.de =!> schau.de =!> schau
    (index > 0 &&
      currentHost.length - index === blockedHost.length &&
      currentHost.charAt(index - 1) === ".")
  );
};
