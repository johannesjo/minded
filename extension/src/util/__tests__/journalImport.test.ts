import { importJournalFile } from "@src/util/journalImport";
import { JOURNAL_FILE_KIND, JournalFile } from "@src/util/journalBackup";
import { Answer, SyncData } from "@src/dataInterface/syncData";

const answer = (id: string, ts: number): Answer =>
  ({
    id,
    ts,
    val: "x",
    qid: null,
    questionCategoryId: "cat",
  }) as unknown as Answer;

const file = (answers: Answer[]): JournalFile => ({
  kind: JOURNAL_FILE_KIND,
  version: 1,
  exportedTS: 0,
  answers,
  customQuestions: [],
});

const makeStore = (initial: Answer[], acceptsUpTo = Infinity) => {
  let stored: Partial<SyncData> = { answers: initial, customQuestions: [] };
  const writes: Partial<SyncData>[] = [];
  return {
    get: async () => stored as SyncData,
    patch: async (patch: Partial<SyncData>) => {
      writes.push(patch);
      if ((patch.answers?.length ?? 0) > acceptsUpTo) {
        throw new Error("QUOTA_BYTES_PER_ITEM quota exceeded");
      }
      stored = { ...stored, ...patch };
    },
    stored: () => stored,
    writes,
  };
};

describe("importJournalFile", () => {
  it("adds everything when it fits", async () => {
    const store = makeStore([answer("a", 1)]);
    const outcome = await importJournalFile(
      file([answer("b", 2), answer("c", 3)]),
      store.get,
      store.patch,
    );
    expect(outcome).toEqual({
      kind: "added",
      answers: 2,
      questions: 0,
      truncated: false,
    });
    expect(store.stored().answers?.map((a) => a.id)).toEqual(["a", "b", "c"]);
  });

  it("on a quota rejection keeps the most recent imported answers that fit, never the device's own", async () => {
    const existing = [answer("old-1", 1), answer("old-2", 2)];
    // Room for 3 answers total: the two existing plus one imported.
    const store = makeStore(existing, 3);
    const outcome = await importJournalFile(
      file([
        answer("i-1", 10),
        answer("i-2", 20),
        answer("i-3", 30),
        answer("i-4", 40),
      ]),
      store.get,
      store.patch,
    );
    expect(outcome).toEqual({
      kind: "added",
      answers: 1,
      questions: 0,
      truncated: true,
    });
    expect(store.stored().answers?.map((a) => a.id)).toEqual([
      "old-1",
      "old-2",
      "i-4",
    ]);
  });

  it("reports failure for a non-quota error without retrying", async () => {
    const store = makeStore([]);
    const patch = jest.fn(async () => {
      throw new Error("MAX_WRITE_OPERATIONS_PER_MINUTE quota exceeded");
    });
    const outcome = await importJournalFile(
      file([answer("a", 1)]),
      store.get,
      patch,
    );
    expect(outcome).toEqual({ kind: "failed" });
    expect(patch).toHaveBeenCalledTimes(1);
  });

  it("gives up when even the device's own answers no longer fit", async () => {
    const store = makeStore([answer("a", 1)], 0);
    const outcome = await importJournalFile(
      file([answer("b", 2)]),
      store.get,
      store.patch,
    );
    expect(outcome).toEqual({ kind: "failed" });
  });
});
