import { SyncData } from '@src/shared/data/sync-data';

export const isOnBlockedUrl = (currentUrl: string, syncData: SyncData): boolean => {
  const host = cleanHostWWW(new URL(currentUrl).host);
  const cfg = syncData.cfg;
  console.log(host, cfg.blockedHosts);

  return (
    !!cfg.blockedHosts.find((blockedHost) =>
      isMatchingHost(host, blockedHost)
    )
  );
};
const cleanHostWWW = (host: string): string => {
  return host.replace(/^www\./, "");
};

const isMatchingHost = (
  currentHost: string,
  blockedHost: string
): boolean => {
  const index = currentHost.indexOf(blockedHost);
  console.log(index, currentHost, blockedHost);

  return (
    // e.g. tagesschau.de => tagesschau.de
    (index === 0 && currentHost.length === blockedHost.length) ||
    // e.g. tagesschau.de => sport.tagesschau.de =!> schau.de =!> schau
    (index > 0 &&
      currentHost.length - index === blockedHost.length &&
      currentHost.charAt(index - 1) === ".")
  );
};
