export const ACTION_ADVICES_MAX_HOUR = 22;
export const ACTION_ADVICES_MIN_HOUR = 4;
export const ACTION_ADVICES: {
  ico?: string;
  txt: string;
}[] = [
  { ico: "✿", txt: "How about looking out the window for a minute?" },
  { ico: "☕", txt: "How about a short break?" },
  { ico: "🏅", txt: "How about a little stretch?" },
  { ico: "🌞", txt: "How about some fresh air?" },
  { ico: "࿋", txt: "How about a deep breath?" },
  { ico: "🌊", txt: "How about some water?" },
  {
    ico: "🤔",
    txt: "Sometimes procrastination is an indicator that you actually should be doing something else than the task you are avoiding...",
  },
] as const;
