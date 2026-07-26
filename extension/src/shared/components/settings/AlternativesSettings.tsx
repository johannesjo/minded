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
  getAlternativesForTarget,
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

  return (
    <div class={styles.row}>
      <TextInput
        value={getDraft()}
        placeholder={isAppScope() ? "Books" : "example.com"}
        ariaLabel={isAppScope() ? "Alternative app" : "Alternative website"}
        ref={(el) => {
          if (props.isAutoFocus) setTimeout(() => el.focus());
        }}
        onInput={(value) => setDraft(value)}
        onEnter={(value) => props.onCommit(value)}
        onBlur={(value) => props.onCommit(value)}
      />
      <Btn
        variant="icon"
        small
        title="Remove"
        aria-label={`Remove ${getAlternativeValue(props.alternative) || "alternative"}`}
        onClick={props.onRemove}
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
  // The blank row waiting for a first keystroke. Kept out of the stored list so
  // an abandoned row simply disappears.
  const [getDraftAlternative, setDraftAlternative] =
    createSignal<Alternative | null>(null);

  onMount(() => {
    if (props.initialAlternatives !== undefined) return;

    getSyncData().then((syncData) => {
      setAlternatives(
        getAlternativesForTarget(syncData, undefined, getPlatform())
          .filter((alternative) => alternative.disabledTS === undefined)
          .sort(byCreated),
      );
    });
  });

  // The in-flight delete, so undo can sequence behind it: unsequenced, the
  // re-add could land first and the delete would swallow it again.
  let pendingRemove: Promise<boolean> = Promise.resolve(true);

  const createEmptyAlternative = (): Alternative =>
    isAppScope()
      ? createUserAppAlternative("")
      : createUserWebsiteAlternative("");

  const commit = (alternative: Alternative, value: string) => {
    const trimmed = value.trim();
    // An emptied row is not a delete - there is a button for that, and losing
    // an entry to a stray select-all would be the opposite of a safety net.
    if (!trimmed || trimmed === getAlternativeValue(alternative)) return;

    const renamed = createRenamedAlternative(alternative, trimmed);
    setAlternatives(
      getAlternatives()
        .filter(
          (existing) =>
            existing.id !== alternative.id && existing.id !== renamed.id,
        )
        .concat(renamed)
        .sort(byCreated),
    );
    void renameAlternative(alternative, trimmed);
  };

  const add = (value: string) => {
    const trimmed = value.trim();
    setDraftAlternative(null);
    if (!trimmed) return;

    const added = isAppScope()
      ? createUserAppAlternative(trimmed)
      : createUserWebsiteAlternative(trimmed);
    if (getAlternatives().some((existing) => existing.id === added.id)) return;

    setAlternatives([...getAlternatives(), added]);
    saveAlternative(added).catch((error: unknown) => {
      // Never show a row that isn't actually stored (the data layer has already
      // told the user what went wrong).
      console.error(
        "Alternative save failed - removing it from the list",
        error,
      );
      setAlternatives(
        getAlternatives().filter((existing) => existing.id !== added.id),
      );
    });
  };

  const remove = (alternative: Alternative) => {
    setAlternatives(
      getAlternatives().filter((existing) => existing.id !== alternative.id),
    );
    setRemoved(alternative);
    pendingRemove = removeAlternative(alternative).then(
      () => true,
      () => false,
    );
  };

  const undoRemove = () => {
    const removed = getRemoved();
    if (!removed) return;

    setRemoved(null);
    setAlternatives([...getAlternatives(), removed].sort(byCreated));
    // If the delete itself failed the entry never left storage, so re-adding
    // would be a no-op at best - only restore what really went.
    pendingRemove.then((didRemove) => {
      if (didRemove) void saveAlternative(removed);
    });
  };

  return (
    <div class={styles.AlternativesSettings}>
      <div class={styles.header}>
        <h3 class="h3">Alternatives</h3>
      </div>
      <p class={styles.description}>
        {isAppScope()
          ? "The apps you said you'd rather turn to. The sun offers one back to you now and then."
          : "The places you said you'd rather go. The sun offers one back to you now and then."}
      </p>

      <div class={styles.list}>
        <Show when={!getAlternatives().length && !getDraftAlternative()}>
          <p class={styles.emptyState}>
            Nothing here yet. The sun will ask you sometime.
          </p>
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

      <Show when={getRemoved()}>
        <div class={styles.status} aria-live="polite">
          <span>Removed.</span>
          <button type="button" class={styles.undoButton} onClick={undoRemove}>
            Undo
          </button>
        </div>
      </Show>

      <div class={styles.controls}>
        <Btn
          disabled={!!getDraftAlternative()}
          onClick={() => setDraftAlternative(createEmptyAlternative())}
        >
          <Ico name="add" /> Add
        </Btn>
      </div>
    </div>
  );
};
