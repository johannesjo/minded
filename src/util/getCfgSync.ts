import { CfgSync } from "../cfg";
import { DEFAULT_CFG } from "../default-cfg.const";
import { bro } from "./browser";

export const getCfgSync = (): Promise<CfgSync> => {
  if(bro.runtime?.id) {
    return bro.storage.sync.get().then((cfg) => ({
      ...DEFAULT_CFG,
      ...cfg,
    }));
  } else {
    console.warn(
      "Extension was reloaded, please reload tab for it to work here again"
    );
    return Promise.resolve({...DEFAULT_CFG});
  }
};
