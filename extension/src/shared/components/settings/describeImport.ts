const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * The one line said after bringing a copy back. It reports the file
 * operation ("added 12 answers"), a fact about the copy - not a read-back of
 * the user's behaviour, so it stays clear of the no-tallies rule.
 */
export const describeImport = (answers: number, questions: number): string => {
  if (answers === 0 && questions === 0) {
    return "Everything in that copy is already here.";
  }
  const parts: string[] = [];
  if (answers > 0) parts.push(plural(answers, "answer", "answers"));
  if (questions > 0) parts.push(plural(questions, "question", "questions"));
  return `Added ${parts.join(" and ")}.`;
};
