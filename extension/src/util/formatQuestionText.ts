/**
 * Renders a question's stored text as a display-ready prompt. Question data is
 * kept without trailing punctuation (e.g. "What matters more to you"), so a "?"
 * is appended — but only when the text isn't already a full sentence. Text that
 * already contains a "?", or ends in ".", "!" or "…" (statement-style prompts
 * like "Today I learned..."), is left untouched. This is the single source of
 * truth for question punctuation; render every question through it rather than
 * concatenating "?" directly, which would double up ("… online??") or mangle
 * statement prompts ("The words you'd like to live by are...?").
 */
export const formatQuestionText = (txt: string): string => {
  const trimmed = (txt || "").trim();
  if (!trimmed) return "";
  if (trimmed.includes("?")) return trimmed;
  const lastChar = trimmed[trimmed.length - 1];
  if (lastChar === "." || lastChar === "!" || lastChar === "…") {
    return trimmed;
  }
  return trimmed + "?";
};
