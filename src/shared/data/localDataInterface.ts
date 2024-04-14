import { bro } from "@src/util/browser";
import { LocalData } from "@src/shared/data/localData";

export const saveLocalData = (localData: LocalData): Promise<void> => {
  if (bro.runtime?.id) {
    return bro.storage.local.set(localData);
  } else {
    throw new Error(
      "Extension was reloaded, please reload tab for it to work here again",
    );
  }
};
