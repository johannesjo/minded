import { createSignal, For, JSX, onMount, Show } from "solid-js";
import {
  getSyncData,
  IS_APP,
  IS_IOS,
  removeAlternative,
  renameAlternative,
  saveAlternative,
} from "@src/dataInterface/commonSyncDataInterface";
import type { Alternative, SessionPlatform } from "@src/dataInterface/syncData";
import {
  createRenamedAlternative,
  createUserAppAlternative,
  createUserWebsiteAlternative,
  getEditableAlternatives,
} from "@src/shared/components/interaction/alternatives/getAlternatives";
import Btn from "@src/shared/components/ui/Btn";
import { Ico } from "@src/shared/components/ui/Ico";
import { TextInput } from "@src/shared/components/ui/TextInput";
import styles from "./AlternativesSettings.module.scss";

const getPlatform = (): SessionPlatform =>
  IS_APP ? (IS_IOS ? "ios" : "android") : "web";

const isAppScope = (): boolean => IS_APP;

const getAlternativeValue = (alternative: Alternative): string =>
  alternative.kind === "website"
    ? (alternative.url ?? alternative.label)
    : alternative.label;

const createAlternativeFor = (value: string): Alternative =>
  isAppScope()
    ? createUserAppAlternative(value)
    : createUserWebsiteAlternative(value);

const byCreated = (a: Alternative, b: Alternative): number =>
  a.createdTS - b.createdTS;

/**
 * One row: the stored text, editable in place, plus a way to take it back.
 * Keeps its own draft so typing doesn't fight the stored value; commits on
 * blur or Enter, the same as the website list.
 */
const AlternativeRow = (props: {
  alternative: Alternative;
  isAutoFocus?: boolean;
  onCommit: (value: string) => void;
  onRemove: () => void;
}): JSX.Element => {
  const [getDraft, setDraft] = createSignal(
    getAlternativeValue(props.alternative),
  );
  // Reaching for ✕ blurs the field first, and again on the way out after the
  // click. Committing on either would re-add what the user just discarded, so
  // the button flags its intent on the way in and keeps it set on the way out.
  // (preventDefault on the press can't help: Solid delegates to `document`, by
  // which point Chrome has already moved focus.)
  let isRemoveIntent = false;

  return (
    <div
      class={styles.row}
      onFocusIn={(event) => {
        // Coming back to the field abandons a half-finished reach for ✕. Focus
        // landing on the button itself must not clear it - that *is* the reach.
        if ((event.target as HTMLElement).tagName !== "BUTTON") {
          isRemoveIntent = false;
        }
      }}
      onFocusOut={(event) => {
        const nextTarget = event.relatedTarget as Node | null;
        // Focus moving onto this row's own ✕ - by pointer or by Tab - means
        // remove, so let the button's click speak rather than committing here.
        if (
          isRemoveIntent ||
          (nextTarget && event.currentTarget.contains(nextTarget))
        ) {
          return;
        }
        props.onCommit(getDraft());
      }}
    >
      <TextInput
        value={getDraft()}
        placeholder={isAppScope() ? "Books" : "example.com"}
        ariaLabel={isAppScope() ? "Alternative app" : "Alternative website"}
        ref={(el) => {
          if (props.isAutoFocus) setTimeout(() => el.focus());
        }}
        onInput={(value) => setDraft(value)}
        onEnter={(value) => props.onCommit(value)}
      />
      <Btn
        variant="icon"
        small
        title="Remove"
        aria-label={`Remove ${getAlternativeValue(props.alternative) || "alternative"}`}
        onPointerDown={() => {
          isRemoveIntent = true;
        }}
        onClick={() => {
          // Stays set: this row is going away, and its parting focusout must
          // not commit the draft that was just discarded.
          isRemoveIntent = true;
          props.onRemove();
        }}
      >
        <Ico name="close" />
      </Btn>
    </div>
  );
};

/**
 * The home for the answers to "what would be better to turn to instead?".
 *
 * Those are typed into an intervention - mid-pull, in a couple of seconds - so
 * a typo or a line typed by accident is entirely ordinary, and until now there
 * was nowhere to take it back: the app would keep offering it. Nothing here
 * counts or scores; it is only the list, in your own words, editable.
 */
export const AlternativesSettings = (props: {
  initialAlternatives?: Alternative[];
}): JSX.Element => {
  const [getAlternatives, setAlternatives] = createSignal<Alternative[]>(
    props.initialAlternatives ?? [],
  );
  // The just-removed entry, so an accidental delete can be undone in place -
  // the same quiet safety net the website list and the answer list carry.
  const [getRemoved, setRemoved] = createSignal<Alternative | null>(null);
  const [getIsSaveFailed, setIsSaveFailed] = createSignal(false);
  // The blank row waiting for a first keystroke. Kept out of the stored list so
  // an abandoned row simply disappears.
  const [getDraftAlternative, setDraftAlternative] =
    createSignal<Alternative | null>(null);

  const readFromStorage = () =>
    getSyncData().then(
      (syncData) =>
        setAlternatives(getEditableAlternatives(syncData, getPlatform())),
      (error: unknown) => {
        console.error("Could not read the alternatives", error);
      },
    );

  onMount(() => {
    if (props.initialAlternatives !== undefined) return;
    void readFromStorage();
  });

  // Every write goes through one chain. `updateSyncDataField` reads a snapshot
  // before it patches, and the extension patches by writing the whole object -
  // so two writes started in the same tick both rebase on the pre-change data
  // and the later one silently undoes the earlier. A fast double-tap on ✕ is
  // enough to trigger it; serialising keeps a burst honest.
  let pendingWrite: Promise<unknown> = Promise.resolve();

  /**
   * Run a write behind the ones before it. On failure the list is re-read from
   * storage rather than patched back by hand, so what is on screen is always
   * what was actually stored - this page's patch rejects silently otherwise.
   */
  const write = (run: () => Promise<void>): void => {
    pendingWrite = pendingWrite.then(run).then(undefined, (error: unknown) => {
      console.error("Could not save the alternatives", error);
      setRemoved(null);
      setIsSaveFailed(true);
      return readFromStorage();
    });
  };

  const commit = (alternative: Alternative, value: string) => {
    const trimmed = value.trim();
    // An emptied row is not a delete - there is a button for that, and losing
    // an entry to a stray select-all would be the opposite of a safety net.
    if (!trimmed || trimmed === getAlternativeValue(alternative)) return;

    const renamed = createRenamedAlternative(alternative, trimmed);
    // Editing one entry onto another's text merges the two. The entry that was
    // already there is the one being merged *into*, so it stays as it is - the
    // data layer keeps its record for the same reason.
    const merged = getAlternatives().find(
      (existing) =>
        existing.id === renamed.id && existing.id !== alternative.id,
    );
    setIsSaveFailed(false);
    setAlternatives(
      getAlternatives()
        .filter(
          (existing) =>
            existing.id !== alternative.id && existing.id !== renamed.id,
        )
        .concat(merged ?? renamed)
        .sort(byCreated),
    );
    write(() => renameAlternative(alternative, trimmed));
  };

  const add = (value: string) => {
    const trimmed = value.trim();
    setDraftAlternative(null);
    if (!trimmed) return;

    const added = createAlternativeFor(trimmed);
    if (getAlternatives().some((existing) => existing.id === added.id)) return;

    setIsSaveFailed(false);
    setAlternatives([...getAlternatives(), added]);
    write(() => saveAlternative(added));
  };

  const remove = (alternative: Alternative) => {
    setIsSaveFailed(false);
    setAlternatives(
      getAlternatives().filter((existing) => existing.id !== alternative.id),
    );
    setRemoved(alternative);
    write(() => removeAlternative(alternative));
  };

  const undoRemove = () => {
    const removed = getRemoved();
    if (!removed) return;

    setRemoved(null);
    // The same text may have come back in the meantime (retyped, or another row
    // renamed onto it) - one id, one row.
    if (getAlternatives().some((existing) => existing.id === removed.id))
      return;

    setAlternatives([...getAlternatives(), removed].sort(byCreated));
    write(() => saveAlternative(removed));
  };

  return (
    <div class={styles.AlternativesSettings}>
      <div class={styles.header}>
        <h3 class="h3">
          {isAppScope() ? "What to open instead" : "Where to go instead"}
        </h3>
      </div>
      <p class={styles.description}>
        The sun offers one of these back to you now and then.
      </p>

      <div class={styles.list}>
        <Show when={!getAlternatives().length && !getDraftAlternative()}>
          <p class={styles.emptyState}>Nothing here yet.</p>
        </Show>

        <For each={getAlternatives()}>
          {(alternative) => (
            <AlternativeRow
              alternative={alternative}
              onCommit={(value) => commit(alternative, value)}
              onRemove={() => remove(alternative)}
            />
          )}
        </For>

        <Show when={getDraftAlternative()}>
          {(draft) => (
            <AlternativeRow
              alternative={draft()}
              isAutoFocus={true}
              onCommit={(value) => add(value)}
              onRemove={() => setDraftAlternative(null)}
            />
          )}
        </Show>
      </div>

      <Show when={getIsSaveFailed() || getRemoved()}>
        <div class={styles.status} aria-live="polite">
          <Show
            when={getIsSaveFailed()}
            fallback={
              <>
                <span>Removed.</span>
                <button
                  type="button"
                  class={styles.undoButton}
                  onClick={undoRemove}
                >
                  Undo
                </button>
              </>
            }
          >
            <span>Could not save. Please try again.</span>
          </Show>
        </div>
      </Show>

      <div class={styles.controls}>
        <Btn
          disabled={!!getDraftAlternative()}
          onClick={() => setDraftAlternative(createAlternativeFor(""))}
        >
          <Ico name="add" /> Add
        </Btn>
      </div>
    </div>
  );
};
