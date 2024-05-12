import { EntryForHost, LocalData } from "@src/dataInterface/localData";

export const updateHostsEntry = async (
  host: string,
  dataForHost: Partial<EntryForHost>,
): Promise<void> => {
  console.log("XXX");
  // if (bro.runtime?.id) {
  //   const d = await loadLocalData();
  //   return bro.storage.local.set({
  //     ...d,
  //     hostsData: {
  //       ...d.hostsData,
  //       [host]: {
  //         ...d.hostsData[host],
  //         ...dataForHost,
  //       },
  //     },
  //   });
  // } else {
  //   throw new Error(
  //     "Extension was reloaded, please reload tab for it to work here again",
  //   );
  // }
};

export const saveLocalData = async (localData: LocalData): Promise<void> => {
  console.log("XXX");

  // if (bro.runtime?.id) {
  //   return bro.storage.local.set(localData);
  // } else {
  //   throw new Error(
  //     "Extension was reloaded, please reload tab for it to work here again",
  //   );
  // }
};

export const loadDataForHost = async (
  host: string,
): Promise<EntryForHost | undefined> => {
  return "XXX " as any;

  // const d = await loadLocalData();
  // return d.hostsData[host];
};

export const loadLocalData = async (): Promise<LocalData> => {
  console.log("XXX");
  return "XXX " as any;
  // if (bro.runtime?.id) {
  //   const d = await bro.storage.local.get();
  //   if (d.hostsData) {
  //     return d as LocalData;
  //   } else {
  //     return { hostsData: {} };
  //   }
  // } else {
  //   throw new Error(
  //     "Extension was reloaded, please reload tab for it to work here again",
  //   );
  // }
};
