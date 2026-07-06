export const ACTION_ADVICES_MAX_HOUR = 22;
export const ACTION_ADVICES_MIN_HOUR = 5;
// No decorative glyph, by design: platform emoji are the loudest, most chat-app
// mark available — they render differently on every OS, sit at full saturation,
// and clash with the calm serif/sky language around them. One advice shows at a
// time, so the serif line carries the screen on its own (like the NOTICE cues).
// (See #168/#177, follow-up to #129.)
export const ACTION_ADVICES: {
  txt: string;
}[] = [
  { txt: "How about looking out the window for a minute?" },
  { txt: "How about a short break?" },
  { txt: "How about a little stretch?" },
  { txt: "How about some fresh air?" },
  { txt: "How about a deep breath?" },
  { txt: "How about some water?" },
  { txt: "How about a minute away from the screen?" },
  { txt: "How about making a tea or coffee?" },
  { txt: "How about resting your eyes on something far away?" },
  { txt: "How about tidying one small thing nearby?" },
  { txt: "Is there someone you've been meaning to reach out to?" },
  { txt: "How about washing your face with cold water?" },
  {
    txt: "Sometimes procrastination is an indicator that you actually should be doing something else than the task you are avoiding...",
  },
  {
    txt: "If you have a task to finish, try to think about the smallest possible step you can do right now!",
  },
] as const;
