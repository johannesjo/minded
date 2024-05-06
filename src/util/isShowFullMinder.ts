import { SyncData } from "@src/shared/data/syncData";
import { STATIC_CFG } from "@src/shared/data/syncData.const";
import { getHostFromUrl } from "@src/util/getHostFromUrl";

export const isShowFullMinder = (
  currentUrl: string,
  syncData: SyncData,
): boolean => {
  const host = getHostFromUrl(currentUrl);
  // TODO remove
  console.log(
    "isShowFullMinder()",
    STATIC_CFG.ShowAgainThreshold < Date.now() - syncData.lastBlockedTS ||
      !syncData.lastBlockedUrl ||
      host !== getHostFromUrl(syncData.lastBlockedUrl),
    STATIC_CFG.ShowAgainThreshold,
    Date.now() - syncData.lastBlockedTS,
    !syncData.lastBlockedUrl,
    host !== getHostFromUrl(syncData.lastBlockedUrl),
  );
  return (
    STATIC_CFG.ShowAgainThreshold < Date.now() - syncData.lastBlockedTS ||
    !syncData.lastBlockedUrl ||
    host !== getHostFromUrl(syncData.lastBlockedUrl)
  );
};
