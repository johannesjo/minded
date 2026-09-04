import {
  buildJournalFile,
  journalFileName,
  JOURNAL_FILE_KIND,
  mergeJournal,
  parseJournalFile,
  serializeJournalFile,
} from "@src/util/journalBackup";
import { Answer, CustomQuestion } from "@src/dataInterface/syncData";

const answer = (id: string, ts: number, val = "x"): Answer =>
  ({ id, ts, val, qid: "q1", questionCategoryId: "cat" }) as unknown as Answer;
const question = (id: string): CustomQuestion =>
  ({
    id,
    t: "What did I come for?",
    createdTS: 1,
  }) as unknown as CustomQuestion;

describe("journal file round trip", () => {
  it("serializes and parses back the same answers and questions", () => {
    const file = buildJournalFile(
      { answers: [answer("a", 10)], customQuestions: [question("q")] },
      123,
    );
    const parsed = parseJournalFile(serializeJournalFile(file));
    expect(parsed).toEqual(file);
    expect(file.kind).toBe(JOURNAL_FILE_KIND);
  });

  it("treats a missing customQuestions field as empty", () => {
    expect(buildJournalFile({ answers: [] }).customQuestions).toEqual([]);
  });

  it("names the file by the local calendar day", () => {
    expect(journalFileName(new Date(2026, 8, 4, 12).getTime())).toBe(
      "minded-answers-2026-09-04.json",
    );
  });
});

describe("parseJournalFile", () => {
  it.each(["", "not json", "[]", "{}", '{"kind":"other","answers":[]}'])(
    "rejects %p",
    (text) => {
      expect(parseJournalFile(text)).toBeNull();
    },
  );

  it("drops entries without an answer's shape but keeps the rest", () => {
    const parsed = parseJournalFile(
      JSON.stringify({
        kind: JOURNAL_FILE_KIND,
        answers: [answer("ok", 1), { id: "no-ts" }, "junk", null],
        customQuestions: [question("q"), { id: 1 }],
      }),
    );
    expect(parsed?.answers.map((a) => a.id)).toEqual(["ok"]);
    expect(parsed?.customQuestions.map((q) => q.id)).toEqual(["q"]);
  });
});

describe("mergeJournal", () => {
  it("adds only what the device doesn't have, in time order", () => {
    const merged = mergeJournal(
      { answers: [answer("a", 5)], customQuestions: [] },
      {
        answers: [answer("c", 9), answer("a", 5, "edited"), answer("b", 7)],
        customQuestions: [question("q")],
      },
    );
    expect(merged.answers.map((a) => a.id)).toEqual(["a", "b", "c"]);
    expect(merged.addedAnswers).toBe(2);
    expect(merged.addedQuestions).toBe(1);
  });

  it("never overwrites an existing answer on an id clash", () => {
    const merged = mergeJournal(
      { answers: [answer("a", 5, "mine")], customQuestions: [] },
      { answers: [answer("a", 5, "theirs")], customQuestions: [] },
    );
    expect(merged.answers).toEqual([answer("a", 5, "mine")]);
    expect(merged.addedAnswers).toBe(0);
  });

  it("is idempotent: importing the same file twice adds nothing", () => {
    const file = {
      answers: [answer("a", 1), answer("b", 2)],
      customQuestions: [],
    };
    const once = mergeJournal({ answers: [], customQuestions: [] }, file);
    const twice = mergeJournal(once, file);
    expect(twice.addedAnswers).toBe(0);
    expect(twice.answers).toEqual(once.answers);
  });

  it("ignores duplicate ids inside the file itself", () => {
    const merged = mergeJournal(
      { answers: [], customQuestions: [] },
      { answers: [answer("a", 1), answer("a", 1)], customQuestions: [] },
    );
    expect(merged.addedAnswers).toBe(1);
  });
});
