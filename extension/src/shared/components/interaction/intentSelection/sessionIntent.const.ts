import { SessionIntent } from "@src/dataInterface/syncData";

export const SESSION_INTENT_OPTIONS: SessionIntent[] = [
  { id: "reply_or_message" },
  { id: "check_one_thing" },
  { id: "take_short_break" },
  { id: "not_sure_yet" },
];

export const SESSION_INTENT_LABELS: Record<SessionIntent["id"], string> = {
  reply_or_message: "Reply to someone",
  check_one_thing: "Check one thing",
  take_short_break: "Take a short break",
  not_sure_yet: "Not sure yet",
};

const SESSION_INTENT_TIME_QUESTIONS: Record<SessionIntent["id"], string> = {
  reply_or_message: "How long for replying to someone?",
  check_one_thing: "How long for checking one thing?",
  take_short_break: "How long for a short break?",
  not_sure_yet: "How long do you want?",
};

export const getSessionIntentLabel = (intent?: SessionIntent): string =>
  intent ? SESSION_INTENT_LABELS[intent.id] : "";

export const getSessionIntentTimeQuestion = (intent?: SessionIntent): string =>
  intent ? SESSION_INTENT_TIME_QUESTIONS[intent.id] : "How long do you want?";
