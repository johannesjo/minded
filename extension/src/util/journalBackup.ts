import { Answer, CustomQuestion, SyncData } from "@src/dataInterface/syncData";

/**
 * The answer journal as a file the user owns.
 *
 * All data is local and every platform is an island: the extension's sync
 * storage is small and prunes the oldest answers when it fills, a lost phone
 * takes its answers with it, and nothing moves between the extension and the
 * app. The journal is the most personal thing minded holds, so it needs a way
 * out that doesn't depend on us - a plain file the user can keep, and bring
 * back on any platform.
 *
 * Bringing a copy back is *additive*: answers and custom questions are matched
 * by id, nothing already present is touched or removed, and the same file can
 * be imported twice without effect.
 */
export const JOURNAL_FILE_KIND = "minded-answers";
export const JOURNAL_FILE_VERSION = 1;

export interface JournalFile {
  kind: typeof JOURNAL_FILE_KIND;
  version: number;
  exportedTS: number;
  answers: Answer[];
  customQuestions: CustomQuestion[];
}

export const buildJournalFile = (
  syncData: Pick<SyncData, "answers" | "customQuestions">,
  now: number = Date.now(),
): JournalFile => ({
  kind: JOURNAL_FILE_KIND,
  version: JOURNAL_FILE_VERSION,
  exportedTS: now,
  answers: syncData.answers ?? [],
  customQuestions: syncData.customQuestions ?? [],
});

export const serializeJournalFile = (file: JournalFile): string =>
  JSON.stringify(file, null, 2);

/** `minded-answers-2026-09-04.json`, dated in the user's local calendar. */
export const journalFileName = (now: number = Date.now()): string => {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `minded-answers-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// Entries are rebuilt from their known fields only, so a hand-edited or
// foreign file can't smuggle extra properties into storage (which on the
// extension also eats into a small per-item quota).
const toAnswer = (v: unknown): Answer | null =>
  isRecord(v) &&
  typeof v.id === "string" &&
  v.id.length > 0 &&
  typeof v.ts === "number" &&
  Number.isFinite(v.ts) &&
  typeof v.questionCategoryId === "string" &&
  (typeof v.val === "string" || typeof v.val === "number") &&
  (v.qid === null || v.qid === undefined || typeof v.qid === "string")
    ? ({
        id: v.id,
        qid: v.qid ?? null,
        questionCategoryId: v.questionCategoryId,
        val: v.val,
        ts: v.ts,
      } as Answer)
    : null;

const toCustomQuestion = (v: unknown): CustomQuestion | null =>
  isRecord(v) &&
  typeof v.id === "string" &&
  v.id.length > 0 &&
  typeof v.t === "string" &&
  typeof v.createdTS === "number"
    ? ({ id: v.id, t: v.t, createdTS: v.createdTS } as CustomQuestion)
    : null;

const compact = <T>(items: (T | null)[]): T[] =>
  items.filter((item): item is T => item !== null);

/**
 * Reads a journal file back. Returns null for anything that isn't one (other
 * JSON, a truncated file, prose). Entries that don't have an answer's shape are
 * dropped rather than failing the whole file, so a hand-edited copy still
 * brings back what it can.
 */
export const parseJournalFile = (text: string): JournalFile | null => {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(raw) || raw.kind !== JOURNAL_FILE_KIND) return null;
  if (!Array.isArray(raw.answers)) return null;
  const customQuestions = Array.isArray(raw.customQuestions)
    ? compact(raw.customQuestions.map(toCustomQuestion))
    : [];
  return {
    kind: JOURNAL_FILE_KIND,
    version: typeof raw.version === "number" ? raw.version : 0,
    exportedTS: typeof raw.exportedTS === "number" ? raw.exportedTS : 0,
    answers: compact(raw.answers.map(toAnswer)),
    customQuestions,
  };
};

export interface JournalMerge {
  answers: Answer[];
  customQuestions: CustomQuestion[];
  addedAnswers: number;
  addedQuestions: number;
}

/**
 * Adds what the file has and the device doesn't. Existing entries win on an id
 * clash (a re-import never overwrites an edit made since). New answers are
 * appended in time order so the journal stays chronological.
 */
export const mergeJournal = (
  current: Pick<SyncData, "answers" | "customQuestions">,
  imported: Pick<JournalFile, "answers" | "customQuestions">,
): JournalMerge => {
  const answers = current.answers ?? [];
  const customQuestions = current.customQuestions ?? [];
  const knownAnswerIds = new Set(answers.map((a) => a.id));
  const knownQuestionIds = new Set(customQuestions.map((q) => q.id));

  const newAnswers = dedupeById(
    imported.answers.filter((a) => !knownAnswerIds.has(a.id)),
  ).sort((a, b) => a.ts - b.ts);
  const newQuestions = dedupeById(
    imported.customQuestions.filter((q) => !knownQuestionIds.has(q.id)),
  );

  return {
    answers: [...answers, ...newAnswers],
    customQuestions: [...customQuestions, ...newQuestions],
    addedAnswers: newAnswers.length,
    addedQuestions: newQuestions.length,
  };
};

const dedupeById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};
