import { bro } from "@src/util/browser";
import {
  ADD_BUDGET_USAGE_MESSAGE_TYPE,
  type AddBudgetUsageMessage,
} from "@src/dataInterface/extension/extensionMessages";

export const closeTab = () => {
  bro.runtime.sendMessage({ closeTab: true });
};

export const addBudgetUsageInBackground = (
  host: string,
  seconds: number,
): Promise<unknown> =>
  bro.runtime.sendMessage({
    type: ADD_BUDGET_USAGE_MESSAGE_TYPE,
    host,
    seconds,
  } satisfies AddBudgetUsageMessage);
