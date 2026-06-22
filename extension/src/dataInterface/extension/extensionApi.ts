import { bro } from "@src/util/browser";
import {
  ADD_USAGE_TIME_MESSAGE_TYPE,
  type AddUsageTimeMessage,
} from "@src/dataInterface/extension/extensionMessages";

export const closeTab = () => {
  bro.runtime.sendMessage({ closeTab: true });
};

export const addUsageTimeInBackground = (
  host: string,
  seconds: number,
): Promise<unknown> =>
  bro.runtime.sendMessage({
    type: ADD_USAGE_TIME_MESSAGE_TYPE,
    host,
    seconds,
  } satisfies AddUsageTimeMessage);
