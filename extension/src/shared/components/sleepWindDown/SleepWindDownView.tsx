import { createSignal, For, JSX, Match, onMount, Show, Switch } from "solid-js";
import {
  getSyncData,
  updateSyncData,
} from "@src/dataInterface/commonSyncDataInterface";
import { DEFAULT_SLEEP_WIND_DOWN } from "@src/dataInterface/syncData.const";
import { resolveNightId, SNOOZE_MINUTES } from "./sleepWindDown.util";
import { getIsoDate } from "@src/util/getIsoDate";
import { Ico } from "@src/shared/components/ui/Ico";
import { BrainDump } from "./activities/BrainDump";
import BreathingExercise from "@src/shared/components/interaction/breathingExercise/BreathingExercise";
import { CALM_READ_TEXT, SLEEP_TIPS } from "@src/shared/data/sleepContent";
import BackgroundTransition from "@src/shared/components/interaction/backgroundTransition/BackgroundTransition";
import Sun from "@src/shared/components/interaction/sun/Sun";
// @ts-ignore
import styles from "./SleepWindDownRoute.module.scss";

type View =
  | "prompt"
  | "menu"
  | "brainDump"
  | "breathing"
  | "calmRead"
  | "tips"
  | "goodnight";

type ActivityKey = "brainDump" | "breathing" | "calmRead" | "tips";

const ACTIVITIES: { key: ActivityKey; label: string; view: View }[] = [
  { key: "brainDump", label: "Gentle brain dump", view: "brainDump" },
  { key: "breathing", label: "Breathing exercise", view: "breathing" },
  { key: "calmRead", label: "Something calm to read", view: "calmRead" },
];

const resolveNightIdFromStorage = async (): Promise<string> => {
  const sd = await getSyncData();
  const cfg = sd.cfg.sleepWindDown ?? DEFAULT_SLEEP_WIND_DOWN;
  return resolveNightId(cfg) ?? getIsoDate();
};

export type SleepWindDownDismissReason = "skip" | "snooze" | "done";

export interface SleepWindDownViewProps {
  /** When true, no state is persisted (used for "Try wind-down now" preview). */
  isPreview?: boolean;
  /**
   * Called after persistence completes. The host decides what "leaving" means
   * — main app navigates to dashboard, Android overlay closes the blocked app.
   */
  onDismiss: (reason: SleepWindDownDismissReason) => void;
}

export const SleepWindDownView = (
  props: SleepWindDownViewProps,
): JSX.Element => {
  const [view, setView] = createSignal<View>("prompt");
  const [completed, setCompleted] = createSignal<Set<ActivityKey>>(new Set());
  const [brainDumpDraft, setBrainDumpDraft] = createSignal("");
  const [hydrated, setHydrated] = createSignal(false);

  let currentNightId: string | null = null;
  let draftPersistPromise: Promise<void> = Promise.resolve();

  onMount(async () => {
    const sd = await getSyncData();
    const cfg = sd.cfg.sleepWindDown ?? DEFAULT_SLEEP_WIND_DOWN;
    currentNightId = resolveNightId(cfg);
    if (currentNightId && sd.sleepWindDownProgressNightId === currentNightId) {
      setCompleted(new Set(sd.sleepWindDownCompleted as ActivityKey[]));
      setBrainDumpDraft(sd.sleepWindDownBrainDumpDraft ?? "");
    }
    setHydrated(true);
  });

  const persistCompleted = async (next: Set<ActivityKey>) => {
    if (props.isPreview) return;
    const nightId = currentNightId ?? (await resolveNightIdFromStorage());
    currentNightId = nightId;
    await updateSyncData({
      sleepWindDownProgressNightId: nightId,
      sleepWindDownCompleted: Array.from(next),
    });
  };

  const markComplete = (key: ActivityKey) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(key);
      persistCompleted(next);
      return next;
    });
  };

  const persistDraft = (text: string) => {
    if (props.isPreview) return;
    const nextPersist = draftPersistPromise
      .catch(() => undefined)
      .then(async () => {
        const nightId = currentNightId ?? (await resolveNightIdFromStorage());
        currentNightId = nightId;
        await updateSyncData({
          sleepWindDownProgressNightId: nightId,
          sleepWindDownBrainDumpDraft: text,
        });
      });
    draftPersistPromise = nextPersist.catch((e) => {
      console.warn("Failed to persist sleep wind-down draft", e);
    });
  };

  const completeBrainDump = async () => {
    const next = new Set(completed());
    next.add("brainDump");
    setCompleted(next);
    setBrainDumpDraft("");

    if (!props.isPreview) {
      await draftPersistPromise;
      const nightId = currentNightId ?? (await resolveNightIdFromStorage());
      currentNightId = nightId;
      await updateSyncData({
        sleepWindDownProgressNightId: nightId,
        sleepWindDownCompleted: Array.from(next),
        sleepWindDownBrainDumpDraft: "",
      });
    }

    setView("menu");
  };

  const dismissForTonight = async () => {
    if (props.isPreview) {
      props.onDismiss("done");
      return;
    }
    const nightId = await resolveNightIdFromStorage();
    await updateSyncData({
      sleepWindDownDismissedNightId: nightId,
      sleepWindDownProgressNightId: "",
      sleepWindDownCompleted: [],
      sleepWindDownBrainDumpDraft: "",
      sleepWindDownSnoozeUntilTS: 0,
    });
    props.onDismiss("done");
  };

  const skipTonight = async () => {
    if (props.isPreview) {
      props.onDismiss("skip");
      return;
    }
    const nightId = await resolveNightIdFromStorage();
    await updateSyncData({
      sleepWindDownDismissedNightId: nightId,
      sleepWindDownProgressNightId: "",
      sleepWindDownCompleted: [],
      sleepWindDownBrainDumpDraft: "",
      sleepWindDownSnoozeUntilTS: 0,
    });
    props.onDismiss("skip");
  };

  const snooze = async () => {
    if (props.isPreview) {
      props.onDismiss("snooze");
      return;
    }
    await updateSyncData({
      sleepWindDownSnoozeUntilTS: Date.now() + SNOOZE_MINUTES * 60 * 1000,
    });
    props.onDismiss("snooze");
  };

  const enterGoodnight = () => {
    setView("goodnight");
  };

  return (
    <div class={`${styles.wrapper} pageTransitionIn`}>
      <Show when={view()} keyed>
        {(currentView) => (
          <div class={styles.viewPane}>
            <Switch>
              <Match when={currentView === "prompt"}>
                <div class={styles.center}>
                  <h2 class="h2">Wind down for sleep?</h2>
                  <p class={styles.subtle}>
                    It's getting late — would you like to take a moment before
                    bed?
                  </p>
                  <div class={styles.btnRow}>
                    <button
                      class="btnTxtOutline"
                      onClick={() => setView("menu")}
                      disabled={!hydrated()}
                    >
                      Yes
                    </button>
                    <button
                      class="btnTxtOutline"
                      onClick={snooze}
                      disabled={!hydrated()}
                    >
                      Snooze 30 min
                    </button>
                    <button
                      class="btnTxtOutline"
                      onClick={skipTonight}
                      disabled={!hydrated()}
                    >
                      Skip tonight
                    </button>
                  </div>
                </div>
              </Match>

              <Match when={currentView === "menu"}>
                <div class={styles.menu}>
                  <h2 class="h2">Choose anything that helps</h2>
                  <p class={styles.subtle}>
                    Pick in any order. Skip what you don't need.
                  </p>
                  <div class={styles.activityList}>
                    <For each={ACTIVITIES}>
                      {(a) => {
                        const isDone = () => completed().has(a.key);
                        return (
                          <button
                            class={`btnToggleSelect ${isDone() ? "isSelected" : ""}`}
                            onClick={() => setView(a.view)}
                            disabled={!hydrated()}
                          >
                            {isDone() && (
                              <span class={styles.activityCheck}>
                                <Ico name="check" />
                              </span>
                            )}
                            <span>{a.label}</span>
                          </button>
                        );
                      }}
                    </For>
                  </div>
                  <div class={styles.menuFooter}>
                    <button
                      class="btnTxt"
                      onClick={enterGoodnight}
                      disabled={!hydrated()}
                    >
                      {completed().size > 0 ? (
                        <>
                          <Ico name="check" /> All done
                        </>
                      ) : (
                        "Goodnight"
                      )}
                    </button>
                  </div>
                  <button
                    class={styles.tipsLink}
                    onClick={() => setView("tips")}
                    disabled={!hydrated()}
                  >
                    Tips for good sleep
                  </button>
                </div>
              </Match>

              <Match when={currentView === "brainDump"}>
                <BrainDump
                  initialText={brainDumpDraft()}
                  onDraftChange={(t) => {
                    setBrainDumpDraft(t);
                    persistDraft(t);
                  }}
                  onBeforeSubmit={() => draftPersistPromise}
                  onDone={completeBrainDump}
                />
              </Match>

              <Match when={currentView === "breathing"}>
                <div class={styles.activityBody}>
                  <BreathingExercise />
                  <div class={styles.activityActions}>
                    <button
                      class="btnTxtOutline"
                      onClick={() => {
                        markComplete("breathing");
                        setView("menu");
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </Match>

              <Match when={currentView === "calmRead"}>
                <div class={styles.activityBody}>
                  <p class={styles.calmRead}>{CALM_READ_TEXT}</p>
                  <div class={styles.activityActions}>
                    <button
                      class="btnTxtOutline"
                      onClick={() => {
                        markComplete("calmRead");
                        setView("menu");
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </Match>

              <Match when={currentView === "tips"}>
                <div class={styles.activityBody}>
                  <h2 class={`h2 ${styles.activityTitle}`}>
                    Tips for good sleep
                  </h2>
                  <ul class={styles.tipsList}>
                    <For each={SLEEP_TIPS}>{(tip) => <li>{tip}</li>}</For>
                  </ul>
                  <div class={styles.activityActions}>
                    <button
                      class="btnTxtOutline"
                      onClick={() => {
                        markComplete("tips");
                        setView("menu");
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </Match>

              <Match when={currentView === "goodnight"}>
                <div class={styles.goodnightGesture}>
                  <BackgroundTransition />
                  <div class={styles.goodnightContent}>
                    <h2 class="h2" style={{ margin: 0 }}>
                      Sleep well
                    </h2>
                    <p class={styles.subtle}>
                      Drag the moon down to let the day go.
                    </p>
                    <div class={styles.moonContainer}>
                      <Sun
                        variant="moon"
                        completionDirection="down"
                        isTapEnabled={false}
                        onSkip={dismissForTonight}
                        onFlingAway={dismissForTonight}
                        onDragComplete={dismissForTonight}
                        onStartBackgroundAnimation={(direction) => {
                          window.dispatchEvent(
                            new CustomEvent("startBackgroundAnimation", {
                              detail: { direction },
                            }),
                          );
                        }}
                      />
                    </div>
                    <button
                      class={`btnTxtOutline ${styles.goodnightDone}`}
                      onClick={dismissForTonight}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </Match>
            </Switch>
          </div>
        )}
      </Show>
    </div>
  );
};

export default SleepWindDownView;
