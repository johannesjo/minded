export const ADD_BUDGET_USAGE_MESSAGE_TYPE = "minded:addBudgetUsage";

export interface AddBudgetUsageMessage {
  type: typeof ADD_BUDGET_USAGE_MESSAGE_TYPE;
  host: string;
  seconds: number;
}

export const isAddBudgetUsageMessage = (
  request: unknown,
): request is AddBudgetUsageMessage => {
  if (!request || typeof request !== "object") {
    return false;
  }

  const message = request as Partial<AddBudgetUsageMessage>;
  return (
    message.type === ADD_BUDGET_USAGE_MESSAGE_TYPE &&
    typeof message.host === "string" &&
    typeof message.seconds === "number"
  );
};

/** Observed foreground time on a blocked host, reported by the content script. */
export const ADD_USAGE_TIME_MESSAGE_TYPE = "minded:addUsageTime";

export interface AddUsageTimeMessage {
  type: typeof ADD_USAGE_TIME_MESSAGE_TYPE;
  host: string;
  seconds: number;
}

export const isAddUsageTimeMessage = (
  request: unknown,
): request is AddUsageTimeMessage => {
  if (!request || typeof request !== "object") {
    return false;
  }

  const message = request as Partial<AddUsageTimeMessage>;
  return (
    message.type === ADD_USAGE_TIME_MESSAGE_TYPE &&
    typeof message.host === "string" &&
    typeof message.seconds === "number"
  );
};
