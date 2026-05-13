import { SessionIntent } from "@src/dataInterface/syncData";

export const SESSION_INTENT_OPTIONS: SessionIntent[] = [
  { id: "reply_or_message" },
  { id: "check_one_thing" },
  { id: "take_short_break" },
];

export const SESSION_INTENT_LABELS: Record<SessionIntent["id"], string> = {
  reply_or_message: "Reply to someone",
  check_one_thing: "Check one thing",
  take_short_break: "Take a short break",
};

const SESSION_INTENT_TIME_QUESTIONS: Record<SessionIntent["id"], string> = {
  reply_or_message: "How long for replying to someone?",
  check_one_thing: "How long for checking one thing?",
  take_short_break: "How long for a short break?",
};

// Fall back to empty / generic copy if a previously valid id was dropped from
// the union (e.g. legacy ActiveTimer intents persisted before this version).
export const getSessionIntentLabel = (intent?: SessionIntent): string =>
  intent ? (SESSION_INTENT_LABELS[intent.id] ?? "") : "";

export const getSessionIntentTimeQuestion = (intent?: SessionIntent): string =>
  intent
    ? (SESSION_INTENT_TIME_QUESTIONS[intent.id] ?? "How long do you want?")
    : "How long do you want?";
