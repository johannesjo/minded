import { SyncData } from "@src/dataInterface/syncData";
import { isPruneRecoverableError } from "@src/dataInterface/storageErrors";
import { JournalFile, mergeJournal } from "@src/util/journalBackup";

/**
 * Bringing a journal file back into storage, with the one platform wrinkle
 * that matters: the extension keeps all answers in a single browser sync
 * item, which is capped at a few kilobytes (the reason saveAnswerN prunes).
 * A phone's journal is usually bigger than that, so a wholesale write is
 * rejected. Rather than fail the whole restore, this brings back the *most
 * recent* imported answers that fit - never touching what's already on the
 * device - and says how many landed. The file the user keeps is still the
 * complete copy.
 */
export type JournalImportOutcome =
  | { kind: "added"; answers: number; questions: number; truncated: boolean }
  | { kind: "failed" };

type Getter = () => Promise<SyncData>;
type Patcher = (patch: Partial<SyncData>) => Promise<void>;

/** Halving the new-answer budget each round reaches 0 within a few tries. */
const MAX_FIT_ROUNDS = 8;

export const importJournalFile = async (
  file: JournalFile,
  getSyncData: Getter,
  patchSyncData: Patcher,
): Promise<JournalImportOutcome> => {
  // Newest first, so a truncated restore keeps the most recent answers.
  const candidates = [...file.answers].sort((a, b) => b.ts - a.ts);
  let budget = candidates.length;
  let truncated = false;

  for (let round = 0; round <= MAX_FIT_ROUNDS; round++) {
    const attempt = { ...file, answers: candidates.slice(0, budget) };
    let added = { answers: 0, questions: 0 };
    try {
      // Re-read and re-merge on every attempt so we rebase onto whatever
      // landed in storage meanwhile (the existing read-modify-write pattern).
      await getSyncData();
      const current = await getSyncData();
      const merged = mergeJournal(current, attempt);
      added = {
        answers: merged.addedAnswers,
        questions: merged.addedQuestions,
      };
      await patchSyncData({
        answers: merged.answers,
        customQuestions: merged.customQuestions,
      });
      return { kind: "added", ...added, truncated };
    } catch (e) {
      if (!isPruneRecoverableError(e) || budget === 0) {
        console.error("Bringing a copy back failed", e);
        return { kind: "failed" };
      }
      truncated = true;
      budget = Math.floor(budget / 2);
    }
  }
  return { kind: "failed" };
};
