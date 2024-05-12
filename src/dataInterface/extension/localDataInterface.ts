import { bro } from "@src/util/browser";
import { EntryForHost, LocalData } from "@src/dataInterface/localData";

export const updateHostsEntry = async (
  host: string,
  dataForHost: Partial<EntryForHost>,
): Promise<void> => {
  if (bro.runtime?.id) {
    const d = await loadLocalData();
    return bro.storage.local.set({
      ...d,
      hostsData: {
        ...d.hostsData,
        [host]: {
          ...d.hostsData[host],
          ...dataForHost,
        },
      },
    });
  } else {
    throw new Error(
      "Extension was reloaded, please reload tab for it to work here again",
    );
  }
};

export const saveLocalData = (localData: LocalData): Promise<void> => {
  if (bro.runtime?.id) {
    return bro.storage.local.set(localData);
  } else {
    throw new Error(
      "Extension was reloaded, please reload tab for it to work here again",
    );
  }
};

export const loadDataForHost = async (
  host: string,
): Promise<EntryForHost | undefined> => {
  const d = await loadLocalData();
  return d.hostsData[host];
};

export const loadLocalData = async (): Promise<LocalData> => {
  if (bro.runtime?.id) {
    const d = await bro.storage.local.get();
    if (d.hostsData) {
      return d as LocalData;
    } else {
      return { hostsData: {} };
    }
  } else {
    throw new Error(
      "Extension was reloaded, please reload tab for it to work here again",
    );
  }
};
