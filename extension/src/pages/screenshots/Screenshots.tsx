import { JSX, onMount } from "solid-js";

import RoutesCmp from "@src/shared/RouteCmp";
import type { SyncData, Answer } from "@src/dataInterface/syncData";
import { QID } from "@src/shared/data/questionId";
import {
  QUESTION_CATEGORIES,
  QuestionCategoryId,
  QuestionForPrompt,
} from "@src/shared/data/questions";
import { MoodCheckinVal } from "@src/shared/components/interaction/moodCheckin/moodCheckin.const";
import { SelfAssessmentId } from "@src/shared/components/interaction/selfAssessmentInteraction/selfAssessment.model";
import { MoodCheckin } from "@src/shared/components/interaction/moodCheckin/MoodCheckin";
import { EnergyLvlInteraction } from "@src/shared/components/interaction/energyLvl/EnergyLvlInteraction";
import { Question } from "@src/shared/components/interaction/Question";
import { IntentSelection } from "@src/shared/components/interaction/intentSelection/IntentSelection";
import { TimeSelection } from "@src/shared/components/interaction/timeSelection/TimeSelection";
import { LittleSunComponent } from "@src/shared/components/interaction/LittleSun";
import { createActiveTimer } from "@src/shared/components/interaction/sessionLimit";

// @ts-ignore
import styles from "./screenshots.module.scss";

type ScreenshotTarget =
  | "dashboard"
  | "mood-checkin"
  | "energy-lvl"
  | "intent-selection"
  | "duration-selection"
  | "active-session"
  | "q-something-i-am-looking-forward-to"
  | "q-this-week-i-will-do-my-best-to";

type ScreenshotTheme = "light" | "dark";
type ScreenshotPlatform = "web-extension" | "android";

const SCREENSHOT_TARGETS: ScreenshotTarget[] = [
  "dashboard",
  "mood-checkin",
  "energy-lvl",
  "intent-selection",
  "duration-selection",
  "active-session",
  "q-something-i-am-looking-forward-to",
  "q-this-week-i-will-do-my-best-to",
];

const SCREENSHOT_SESSION_HOST = "reddit.com";
const SCREENSHOT_SESSION_INTENT = { id: "check_one_thing" } as const;

const getScreenshotTarget = (): ScreenshotTarget => {
  const target = new URLSearchParams(window.location.search).get("target");
  return SCREENSHOT_TARGETS.includes(target as ScreenshotTarget)
    ? (target as ScreenshotTarget)
    : "dashboard";
};

const getScreenshotTheme = (): ScreenshotTheme =>
  new URLSearchParams(window.location.search).get("theme") === "dark"
    ? "dark"
    : "light";

const getScreenshotPlatform = (): ScreenshotPlatform =>
  new URLSearchParams(window.location.search).get("platform") === "android"
    ? "android"
    : "web-extension";

const getQuestion = (
  categoryId: QuestionCategoryId,
  qid: QID,
): QuestionForPrompt => {
  const question = QUESTION_CATEGORIES[categoryId].questions?.find(
    (q) => q.id === qid,
  );
  if (!question) {
    throw new Error(`Screenshot question ${qid} was not found.`);
  }
  return { ...question, categoryId };
};

const createDashboardAnswer = (
  id: string,
  qid: QID,
  questionCategoryId: QuestionCategoryId,
  val: string,
  ts: number,
): Answer => ({
  id,
  qid,
  questionCategoryId,
  val,
  ts,
});

const createScreenshotSyncData = (target: ScreenshotTarget): SyncData => {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const selfAssessment = Object.values(SelfAssessmentId).reduce(
    (acc, curr) => {
      acc[curr] = { ts: 99, val: -1 };
      return acc;
    },
    {} as SyncData["selfAssessment"],
  );

  return {
    cfg: {
      isOnboardingComplete: true,
      blockedApps: [],
      blockedHosts: ["reddit.com", "youtube.com", "instagram.com"],
    },
    lastBlockedTS: 99,
    lastBlockedUrl: "",
    dailyQuestionsMorningTS: now,
    dailyQuestionsEveningTS: now,
    moodCheckTS: now,
    moodCheckVal: MoodCheckinVal.Good,
    moodCheckAdditional: "",
    browsingBehaviorRating: {},
    lastBrowsingBehaviorRatingTS: 99,
    appUsageRating: {},
    lastAppUsageRatingTS: 99,
    energyLvlTS: now,
    energyLvlVal: 3,
    sunTaps: {},
    sunTapTimestamps: [],
    attempts: {},
    selfAssessment: {
      ...selfAssessment,
      [SelfAssessmentId.WAS_OPTIMISTIC]: { ts: now - hour, val: 3 },
      [SelfAssessmentId.SOCIAL_CONTACTS]: { ts: now - 2 * hour, val: 3 },
    },
    alternativeApps: [],
    alternativeWebsites: [],
    patternInsightState: {
      shownInsightIdsByDate: {},
    },
    activeTimer:
      target === "active-session"
        ? createActiveTimer({
            seconds: 5 * 60,
            now,
            target: { kind: "host", id: SCREENSHOT_SESSION_HOST },
            platform: "web",
            intent: SCREENSHOT_SESSION_INTENT,
          })
        : null,
    emotionLabeling: null,
    dailyBudget: null,
    dailyUsage: {},
    budgetPromptDismissedTS: 99,
    sleepWindDownDismissedNightId: "",
    sleepWindDownSnoozeUntilTS: 0,
    sleepWindDownProgressNightId: "",
    sleepWindDownCompleted: [],
    sleepWindDownBrainDumpDraft: "",
    sleepWindDownGratitudeDraft: "",
    sleepWindDownTomorrowDraft: "",
    answers: [
      createDashboardAnswer(
        "screenshot-good-plans-today",
        QID.GPT4,
        QuestionCategoryId.GoodPlansToday,
        "Today I will enjoy a coffee on the balcony.",
        now,
      ),
      createDashboardAnswer(
        "screenshot-refocus",
        QID.RFHT1,
        QuestionCategoryId.RefocusHelperToday,
        "My most important task is to prepare everything for the release of minded.",
        now,
      ),
      createDashboardAnswer(
        "screenshot-goal-week",
        QID.GW1,
        QuestionCategoryId.GoalForTheWeek,
        "This week I want to release minded on Android.",
        now,
      ),
      createDashboardAnswer(
        "screenshot-browsing-habits",
        QID.HBH3,
        QuestionCategoryId.HealthierBrowsingHabits,
        "I could use a fresh clean separate browser without my bookmarks when working.",
        now,
      ),
      createDashboardAnswer(
        "screenshot-personal-resources-1",
        QID.PR1,
        QuestionCategoryId.PersonalResources,
        "I am good at deep work.",
        now - hour,
      ),
      createDashboardAnswer(
        "screenshot-personal-resources-2",
        QID.PR2,
        QuestionCategoryId.PersonalResources,
        "I am a good listener.",
        now,
      ),
      createDashboardAnswer(
        "screenshot-calming",
        QID.CT1,
        QuestionCategoryId.CalmingThoughts,
        "I feel at ease when I find time to breathe.",
        now,
      ),
    ],
  };
};

const setDashboardRandomSequence = () => {
  const randomValues = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.999];
  Math.random = () => randomValues.shift() ?? 0;
};

const applyScreenshotTheme = (
  theme: ScreenshotTheme,
  platform: ScreenshotPlatform,
) => {
  const isDark = theme === "dark";
  const isAndroid = platform === "android";
  const root = document.getElementById("minded-6622");
  const wrapper =
    document.getElementById("minded-6622-coloured-wrapper") ||
    document.getElementById("minded-6622-coloured-wrapper-dynamic");

  root?.classList.toggle("minded-6622-dark", isDark);
  root?.classList.toggle("minded-6622-web-extension", !isAndroid);
  root?.classList.toggle("minded-6622-mobile-app", isAndroid);
  root?.classList.toggle("minded-6622-android", isAndroid);
  root?.classList.toggle("minded-6622-mouse-primary", !isAndroid);
  root?.classList.toggle("minded-6622-touch-primary", isAndroid);
  wrapper?.classList.toggle("minded-6622-dark", isDark);
};

const markReadyAfterPaint = (
  theme: ScreenshotTheme,
  platform: ScreenshotPlatform,
) => {
  window.setTimeout(() => {
    applyScreenshotTheme(theme, platform);
    (window as any).__MINDED_SCREENSHOT_READY__ = true;
  }, 600);
};

const ScreenshotSurface = (props: {
  theme: ScreenshotTheme;
  children: JSX.Element;
}) => (
  <div
    id="minded-6622-coloured-wrapper"
    classList={{ ["minded-6622-dark"]: props.theme === "dark" }}
  >
    <main class={styles.surface}>
      <div class={styles.content}>{props.children}</div>
    </main>
  </div>
);

const ScreenshotQuestion = (props: { question: QuestionForPrompt }) => (
  <Question
    initialQuestion={props.question}
    answers={[]}
    onSuccess={() => undefined}
    onSkip={() => undefined}
    onUpdateQuestion={() => undefined}
    onCancelCountdown={() => undefined}
  />
);

const PostSunFlowFrame = (props: { children: JSX.Element }) => (
  <div class={styles.postSunFlowFrame}>{props.children}</div>
);

const ActiveSessionShot = () => (
  <div class={styles.activeSessionShot}>
    <LittleSunComponent
      host={SCREENSHOT_SESSION_HOST}
      onShowFreshInteraction={() => undefined}
      onTap={() => undefined}
      teardown={() => undefined}
    />
  </div>
);

const Screenshots = (): JSX.Element => {
  const target = getScreenshotTarget();
  const theme = getScreenshotTheme();
  const platform = getScreenshotPlatform();

  (window as any).IS_MAIN_MINDED_6622 = true;
  (window as any).__MINDED_SCREENSHOT_SYNC_DATA__ =
    createScreenshotSyncData(target);
  (window as any).__MINDED_SCREENSHOT_LOCAL_DATA__ = {
    hostsData: {},
    littleSunHintSeen: true,
  };
  (window as any).__MINDED_SCREENSHOT_READY__ = false;
  sessionStorage.setItem("dashboardGroupShown", "true");

  if (target === "dashboard") {
    setDashboardRandomSequence();
  }

  onMount(() => {
    applyScreenshotTheme(theme, platform);
    markReadyAfterPaint(theme, platform);
  });

  if (target === "dashboard") {
    return <RoutesCmp />;
  }

  return (
    <ScreenshotSurface theme={theme}>
      {target === "mood-checkin" && (
        <MoodCheckin
          onSuccess={() => undefined}
          onSkip={() => undefined}
          onCancelCountdown={() => undefined}
        />
      )}

      {target === "energy-lvl" && (
        <EnergyLvlInteraction
          onSuccess={() => undefined}
          onSkip={() => undefined}
          onCancelCountdown={() => undefined}
        />
      )}

      {target === "intent-selection" && (
        <PostSunFlowFrame>
          <IntentSelection
            isArmed={true}
            onCancel={() => undefined}
            onCancelCountdown={() => undefined}
            onSelectIntent={() => undefined}
          />
        </PostSunFlowFrame>
      )}

      {target === "duration-selection" && (
        <PostSunFlowFrame>
          <TimeSelection
            intent={SCREENSHOT_SESSION_INTENT}
            isArmed={true}
            onCancel={() => undefined}
            onSelectTime={() => undefined}
          />
        </PostSunFlowFrame>
      )}

      {target === "active-session" && <ActiveSessionShot />}

      {target === "q-something-i-am-looking-forward-to" && (
        <ScreenshotQuestion
          question={getQuestion(QuestionCategoryId.GoodPlansToday, QID.GPT6)}
        />
      )}

      {target === "q-this-week-i-will-do-my-best-to" && (
        <ScreenshotQuestion
          question={getQuestion(QuestionCategoryId.GoalForTheWeek, QID.GW2)}
        />
      )}
    </ScreenshotSurface>
  );
};

export default Screenshots;
