const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * The one line said after bringing a copy back. It reports the file
 * operation ("added 12 answers"), a fact about the copy - not a read-back of
 * the user's behaviour, so it stays clear of the no-tallies rule.
 */
export const describeImport = (
  answers: number,
  questions: number,
  truncated = false,
): string => {
  if (answers === 0 && questions === 0 && !truncated) {
    return "Everything in that copy is already here.";
  }
  const parts: string[] = [];
  if (answers > 0) parts.push(plural(answers, "answer", "answers"));
  if (questions > 0) parts.push(plural(questions, "question", "questions"));
  const added = parts.length ? `Added ${parts.join(" and ")}.` : "Added none.";
  // Only the extension truncates: its browser sync storage holds a few
  // kilobytes of answers, so the older ones in a big copy don't fit. Said
  // plainly, once, as a fact about this browser - the file is still complete.
  return truncated
    ? `${added} This browser keeps only the most recent answers, so the older ones in that copy didn't fit.`
    : added;
};
