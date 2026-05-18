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
