jest.mock("@src/util/browser", () => ({
  bro: {
    runtime: { id: "test-extension" },
    storage: {
      sync: {
        get: jest.fn(),
        set: jest.fn(),
      },
    },
  },
}));

import { bro } from "@src/util/browser";
import { saveAnswerN } from "@src/dataInterface/extension/syncDataInterface";
import { Answer } from "@src/dataInterface/syncData";
import { QuestionCategoryId } from "@src/shared/data/questions";

const mockGet = bro.storage.sync.get as jest.Mock;
const mockSet = bro.storage.sync.set as jest.Mock;

const answerAt = (
  ts: number,
  categoryId: QuestionCategoryId = QuestionCategoryId.HealthierAppUsage,
): Answer => ({
  id: `a-${ts}`,
  qid: null,
  questionCategoryId: categoryId,
  val: `answer ${ts}`,
  ts,
});

const NEW_ANSWER: Answer = { ...answerAt(1_000_000), id: "the-new-answer" };

describe("saveAnswerN", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("appends the answer and writes it", async () => {
    mockGet.mockResolvedValue({ answers: [answerAt(1)] });
    mockSet.mockResolvedValue(undefined);

    await saveAnswerN(NEW_ANSWER);

    expect(mockSet).toHaveBeenCalledTimes(1);
    const written = mockSet.mock.calls[0][0].answers as Answer[];
    expect(written).toHaveLength(2);
    expect(written[1].id).toBe("the-new-answer");
  });

  it("rejects (never resolves) on a non-quota write failure", async () => {
    mockGet.mockResolvedValue({ answers: [] });
    mockSet.mockRejectedValue(
      new Error("MAX_WRITE_OPERATIONS_PER_MINUTE quota exceeded"),
    );

    await expect(saveAnswerN(NEW_ANSWER)).rejects.toThrow(
      "MAX_WRITE_OPERATIONS_PER_MINUTE",
    );
    // No pointless prune-retry for a rate limit - deleting answers can't cure it.
    expect(mockSet).toHaveBeenCalledTimes(1);
  });

  it("rejects on a transient failure instead of swallowing it", async () => {
    mockGet.mockResolvedValue({ answers: [] });
    mockSet.mockRejectedValue(new Error("An unexpected error occurred"));

    await expect(saveAnswerN(NEW_ANSWER)).rejects.toThrow("unexpected");
  });

  it("prunes oldest answers and retries on QUOTA_BYTES_PER_ITEM", async () => {
    const oldAnswers = Array.from({ length: 40 }, (_, i) => answerAt(i + 1));
    mockGet.mockResolvedValue({ answers: oldAnswers });
    mockSet
      .mockRejectedValueOnce(new Error("QUOTA_BYTES_PER_ITEM quota exceeded"))
      .mockResolvedValueOnce(undefined);

    await saveAnswerN(NEW_ANSWER);

    expect(mockSet).toHaveBeenCalledTimes(2);
    const retried = mockSet.mock.calls[1][0].answers as Answer[];
    expect(retried.length).toBeLessThan(41);
    // Newest kept, oldest dropped.
    expect(retried.some((a) => a.id === "the-new-answer")).toBe(true);
    expect(retried.some((a) => a.id === "a-1")).toBe(false);
  });

  it("recovers from total-quota (QUOTA_BYTES) errors too", async () => {
    const oldAnswers = Array.from({ length: 40 }, (_, i) => answerAt(i + 1));
    mockGet.mockResolvedValue({ answers: oldAnswers });
    mockSet
      .mockRejectedValueOnce(new Error("QUOTA_BYTES quota exceeded"))
      .mockResolvedValueOnce(undefined);

    await expect(saveAnswerN(NEW_ANSWER)).resolves.toBeUndefined();
    expect(mockSet).toHaveBeenCalledTimes(2);
  });

  it("keeps pruning across rounds until the write fits", async () => {
    const oldAnswers = Array.from({ length: 60 }, (_, i) => answerAt(i + 1));
    mockGet.mockResolvedValue({ answers: oldAnswers });
    mockSet
      .mockRejectedValueOnce(new Error("QUOTA_BYTES quota exceeded"))
      .mockRejectedValueOnce(new Error("QUOTA_BYTES quota exceeded"))
      .mockResolvedValueOnce(undefined);

    await saveAnswerN(NEW_ANSWER);

    expect(mockSet).toHaveBeenCalledTimes(3);
    const lastWrite = mockSet.mock.calls[2][0].answers as Answer[];
    expect(lastWrite.some((a) => a.id === "the-new-answer")).toBe(true);
  });

  it("rejects when pruning can no longer make room", async () => {
    // A single huge answer that never fits: pruning leaves only the new
    // answer, and the write still fails - must surface, not loop or swallow.
    mockGet.mockResolvedValue({ answers: [] });
    mockSet.mockRejectedValue(new Error("QUOTA_BYTES_PER_ITEM quota exceeded"));

    await expect(saveAnswerN(NEW_ANSWER)).rejects.toThrow(
      "QUOTA_BYTES_PER_ITEM",
    );
  });

  it("recovers from Firefox's quota message too", async () => {
    // Firefox throws one message for all three storage.sync quotas
    // (ExtensionStorageSync.sys.mjs); it contains neither QUOTA_BYTES nor
    // MAX_ITEMS, so a Chrome-only matcher would strand Firefox users.
    const oldAnswers = Array.from({ length: 40 }, (_, i) => answerAt(i + 1));
    mockGet.mockResolvedValue({ answers: oldAnswers });
    mockSet
      .mockRejectedValueOnce(
        new Error(
          "QuotaExceededError: storage.sync API call exceeded its quota limitations.",
        ),
      )
      .mockResolvedValueOnce(undefined);

    await expect(saveAnswerN(NEW_ANSWER)).resolves.toBeUndefined();
    expect(mockSet).toHaveBeenCalledTimes(2);
  });

  it("keeps the answer being saved even when stored answers have newer timestamps", async () => {
    // Clock skew: the device clock was corrected backwards, so every stored
    // answer's ts is NEWER than the new answer's. The newest-N slice must
    // still never cut the answer being saved.
    const futureAnswers = Array.from({ length: 40 }, (_, i) =>
      answerAt(2_000_000 + i),
    );
    const oldTsAnswer: Answer = { ...answerAt(5), id: "older-than-everything" };
    mockGet.mockResolvedValue({ answers: futureAnswers });
    mockSet
      .mockRejectedValueOnce(new Error("QUOTA_BYTES quota exceeded"))
      .mockResolvedValueOnce(undefined);

    await saveAnswerN(oldTsAnswer);

    const retried = mockSet.mock.calls[1][0].answers as Answer[];
    expect(retried.some((a) => a.id === "older-than-everything")).toBe(true);
  });

  it("never prunes the answer that is being saved, even in a purge category", async () => {
    const oldAnswers = Array.from({ length: 40 }, (_, i) => answerAt(i + 1));
    const purgeCategoryAnswer: Answer = {
      ...answerAt(999_999, QuestionCategoryId.GoodToday),
      id: "good-today-now",
    };
    mockGet.mockResolvedValue({ answers: oldAnswers });
    mockSet
      .mockRejectedValueOnce(new Error("QUOTA_BYTES quota exceeded"))
      .mockResolvedValueOnce(undefined);

    await saveAnswerN(purgeCategoryAnswer);

    const retried = mockSet.mock.calls[1][0].answers as Answer[];
    expect(retried.some((a) => a.id === "good-today-now")).toBe(true);
  });
});
