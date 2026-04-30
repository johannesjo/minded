import { createSignal, JSX, Match, onMount, Switch, For } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import {
  getSyncData,
  updateSyncData,
} from "@src/dataInterface/commonSyncDataInterface";
import { DEFAULT_SLEEP_WIND_DOWN } from "@src/dataInterface/syncData.const";
import { resolveNightId, SNOOZE_MINUTES } from "./sleepWindDown.util";
import { refreshSleepWindDownAlarms } from "./androidBridge";
import { getIsoDate } from "@src/util/getIsoDate";
import { Ico } from "@src/shared/components/ui/Ico";
import { BrainDump } from "./activities/BrainDump";
import BreathingExercise from "@src/shared/components/interaction/breathingExercise/BreathingExercise";
import { CalmRead } from "./activities/CalmRead";
import { SleepTips } from "./activities/SleepTips";
import { Goodnight } from "./activities/Goodnight";
// @ts-ignore
import styles from "./SleepWindDownRoute.module.scss";

type View =
  | "prompt"
  | "snoozeOrSkip"
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
  { key: "tips", label: "Tips for good sleep", view: "tips" },
];

/**
 * Resolve the night id from the user's saved cfg. We always read the latest
 * config rather than caching the value, because a stale `null` would cause
 * dismiss/snooze to silently no-op. Falls back to today's local iso date if
 * cfg is missing — better to over-record than to skip recording the dismissal.
 */
const resolveNightIdFromStorage = async (): Promise<string> => {
  const sd = await getSyncData();
  const cfg = sd.cfg.sleepWindDown ?? DEFAULT_SLEEP_WIND_DOWN;
  return resolveNightId(cfg) ?? getIsoDate();
};

export const SleepWindDownRoute = (): JSX.Element => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPreview = () => searchParams.preview === "1";
  const [view, setView] = createSignal<View>("prompt");
  const [completed, setCompleted] = createSignal<Set<ActivityKey>>(new Set());
  const [brainDumpDraft, setBrainDumpDraft] = createSignal("");
  const [hydrated, setHydrated] = createSignal(false);

  let currentNightId: string | null = null;

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
    if (isPreview()) return;
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

  const persistDraft = async (text: string) => {
    if (isPreview()) return;
    const nightId = currentNightId ?? (await resolveNightIdFromStorage());
    currentNightId = nightId;
    await updateSyncData({
      sleepWindDownProgressNightId: nightId,
      sleepWindDownBrainDumpDraft: text,
    });
  };

  const dismissForTonight = async () => {
    if (isPreview()) {
      // Preview mode (entered via "Try wind-down now") never persists; we
      // don't want a daytime preview to suppress tonight's real window.
      navigate("/");
      return;
    }
    const nightId = await resolveNightIdFromStorage();
    await updateSyncData({
      sleepWindDownDismissedNightId: nightId,
      // Clear the in-progress fields so tomorrow night starts fresh.
      sleepWindDownProgressNightId: "",
      sleepWindDownCompleted: [],
      sleepWindDownBrainDumpDraft: "",
    });
    // Re-arm (don't cancel) so tomorrow's alarm is still scheduled.
    // The alarm receiver gates on dismissedNightId and will skip tonight.
    refreshSleepWindDownAlarms();
    navigate("/");
  };

  const snooze = async () => {
    if (isPreview()) {
      navigate("/");
      return;
    }
    await updateSyncData({
      sleepWindDownSnoozeUntilTS: Date.now() + SNOOZE_MINUTES * 60 * 1000,
    });
    // Re-arm the alarm at the snooze time. The scheduler picks min(snooze,
    // next bedtime), so the alarm will fire at the snooze deadline.
    refreshSleepWindDownAlarms();
    navigate("/");
  };

  return (
    <div class={`${styles.wrapper} pageTransitionIn`}>
      <Switch>
        <Match when={view() === "prompt"}>
          <div class={styles.center}>
            <h2 class="h2">Wind down for sleep?</h2>
            <p class={styles.subtle}>
              It's getting late — would you like to take a moment before bed?
            </p>
            <div class={styles.btnRow}>
              <button class="btnTxt" onClick={() => setView("menu")}>
                <Ico name="check" /> Yes
              </button>
              <button
                class="btnTxtOutline"
                onClick={() => setView("snoozeOrSkip")}
              >
                No
              </button>
            </div>
          </div>
        </Match>

        <Match when={view() === "snoozeOrSkip"}>
          <div class={styles.center}>
            <h3 class="h3">Not right now?</h3>
            <p class={styles.subtle}>
              Snooze for 30 minutes, or skip the rest of tonight.
            </p>
            <div class={styles.btnRow}>
              <button class="btnTxt" onClick={snooze} disabled={!hydrated()}>
                Snooze 30 min
              </button>
              <button
                class="btnTxtOutline"
                onClick={dismissForTonight}
                disabled={!hydrated()}
              >
                Skip tonight
              </button>
            </div>
            <button
              class={styles.linkBtn}
              onClick={() => setView("prompt")}
              style={{ "margin-top": "16px" }}
            >
              Back
            </button>
          </div>
        </Match>

        <Match when={view() === "menu"}>
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
                      {isDone() && <Ico name="check" />}
                      <span style={{ "margin-left": isDone() ? "8px" : 0 }}>
                        {a.label}
                      </span>
                    </button>
                  );
                }}
              </For>
            </div>
            <div class={styles.menuFooter}>
              <button
                class="btnTxt"
                onClick={() => setView("goodnight")}
                disabled={!hydrated()}
              >
                <Ico name="check" /> All done
              </button>
            </div>
          </div>
        </Match>

        <Match when={view() === "brainDump"}>
          <BrainDump
            initialText={brainDumpDraft()}
            onDraftChange={(t) => {
              setBrainDumpDraft(t);
              persistDraft(t);
            }}
            onDone={() => {
              markComplete("brainDump");
              setBrainDumpDraft("");
              persistDraft("");
              setView("menu");
            }}
            onBack={() => setView("menu")}
          />
        </Match>

        <Match when={view() === "breathing"}>
          <div class={styles.center}>
            <BreathingExercise />
            <button
              class="btnTxtOutline"
              style={{ "margin-top": "24px" }}
              onClick={() => {
                markComplete("breathing");
                setView("menu");
              }}
            >
              Done
            </button>
          </div>
        </Match>

        <Match when={view() === "calmRead"}>
          <CalmRead
            onDone={() => {
              markComplete("calmRead");
              setView("menu");
            }}
            onBack={() => setView("menu")}
          />
        </Match>

        <Match when={view() === "tips"}>
          <SleepTips
            onDone={() => {
              markComplete("tips");
              setView("menu");
            }}
            onBack={() => setView("menu")}
          />
        </Match>

        <Match when={view() === "goodnight"}>
          <Goodnight onDone={dismissForTonight} />
        </Match>
      </Switch>
    </div>
  );
};

export default SleepWindDownRoute;
