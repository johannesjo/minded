import { createSignal, JSX } from "solid-js";
import {
  getSyncData,
  patchSyncData,
} from "@src/dataInterface/commonSyncDataInterface";
import Btn from "@src/shared/components/ui/Btn";
import { pickTextFile, saveTextFile } from "@src/util/fileTransfer";
import {
  buildJournalFile,
  journalFileName,
  parseJournalFile,
  serializeJournalFile,
} from "@src/util/journalBackup";
import { importJournalFile } from "@src/util/journalImport";
import { describeImport } from "./describeImport";
import styles from "./JournalBackupSettings.module.scss";

/**
 * Save a copy of the answer journal as a file, or bring one back. See
 * journalBackup.ts for why this exists and why bringing back is additive.
 *
 * The status line reports the outcome of a *file operation* - "added 12
 * answers" - which is a fact about the copy, not a read-back of the user's
 * behaviour, so it stays clear of the no-tallies rule.
 */
// A real journal is tens of kilobytes; anything past this is not one, and
// parsing it on the UI thread would only freeze the page.
const MAX_IMPORT_CHARS = 5_000_000;

export const JournalBackupSettings = (): JSX.Element => {
  const [status, setStatus] = createSignal<string | null>(null);
  const [isBusy, setIsBusy] = createSignal(false);

  const saveCopy = async () => {
    setStatus(null);
    const syncData = await getSyncData();
    const result = saveTextFile(
      journalFileName(),
      serializeJournalFile(buildJournalFile(syncData)),
    );
    if (result === "unsupported") {
      setStatus("Saving a copy isn't available here.");
    }
  };

  const bringCopyBack = async () => {
    setStatus(null);
    const text = await pickTextFile();
    if (text === null) return;
    if (text.length > MAX_IMPORT_CHARS) {
      setStatus("That file is too large to be a copy of your answers.");
      return;
    }
    const file = parseJournalFile(text);
    if (!file) {
      setStatus("That doesn't look like a copy of your answers.");
      return;
    }
    setIsBusy(true);
    const outcome = await importJournalFile(file, getSyncData, patchSyncData);
    setIsBusy(false);
    setStatus(
      outcome.kind === "added"
        ? describeImport(outcome.answers, outcome.questions, outcome.truncated)
        : "Couldn't bring it back.",
    );
  };

  return (
    <div class={styles.JournalBackupSettings}>
      <div class={styles.header}>
        <h3 class="h3">Your answers</h3>
      </div>
      <p class={styles.description}>
        Keep a copy of your answers somewhere safe, or bring one back.
      </p>
      <div class={styles.actions}>
        <Btn outline onClick={saveCopy} disabled={isBusy()}>
          Save a copy
        </Btn>
        <Btn outline onClick={bringCopyBack} disabled={isBusy()}>
          Bring a copy back
        </Btn>
      </div>
      <p class={styles.status} aria-live="polite">
        {status() ?? ""}
      </p>
    </div>
  );
};
