import { createSignal, JSX, onMount } from "solid-js";

import RoutesCmp from "@src/shared/RouteCmp";
import type { SyncData, Answer } from "@src/dataInterface/syncData";
import { QID } from "@src/shared/data/questionId";
import {
  QUESTION_CATEGORIES,
  QuestionCategoryId,
  QuestionForPrompt,
} from "@src/shared/data/questions";
import { EnergyLvlInteraction } from "@src/shared/components/interaction/energyLvl/EnergyLvlInteraction";
import { Question } from "@src/shared/components/interaction/Question";
import { IntentSelection } from "@src/shared/components/interaction/intentSelection/IntentSelection";
import { TimeSelection } from "@src/shared/components/interaction/timeSelection/TimeSelection";
import InteractionCommon from "@src/shared/components/interaction/InteractionCommon";
import Sun from "@src/shared/components/interaction/sun/Sun";
import BackgroundTransition from "@src/shared/components/interaction/backgroundTransition/BackgroundTransition";

// @ts-ignore
import styles from "./screenshots.module.scss";

type ScreenshotTarget =
  | "dashboard"
  | "browser-social"
  | "browser-intervention"
  | "energy-lvl"
  | "draggable-sun"
  | "intent-selection"
  | "duration-selection"
  | "q-something-i-am-looking-forward-to"
  | "q-this-week-i-will-do-my-best-to";

type ScreenshotTheme = "light" | "dark";
type ScreenshotPlatform = "web-extension" | "android";
type BrowserSite = "youtube" | "reddit" | "x" | "tiktok" | "instagram";

const SCREENSHOT_TARGETS: ScreenshotTarget[] = [
  "dashboard",
  "browser-social",
  "browser-intervention",
  "energy-lvl",
  "draggable-sun",
  "intent-selection",
  "duration-selection",
  "q-something-i-am-looking-forward-to",
  "q-this-week-i-will-do-my-best-to",
];

const BROWSER_SITES: BrowserSite[] = [
  "youtube",
  "reddit",
  "x",
  "tiktok",
  "instagram",
];

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

const getIsBrowserVideo = (): boolean =>
  new URLSearchParams(window.location.search).get("browser") === "1";

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

const createScreenshotSyncData = (): SyncData => {
  const now = Date.now();
  const hour = 60 * 60 * 1000;

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
    moodCheckAdditional: "",
    browsingBehaviorRating: {},
    lastBrowsingBehaviorRatingTS: 99,
    appUsageRating: {},
    lastAppUsageRatingTS: 99,
    usageStats: {},
    energyLvlTS: now,
    energyLvlVal: 3,
    sunTaps: {},
    sunTapTimestamps: [],
    attempts: {},
    selfAssessment: {},
    alternativeApps: [],
    alternativeWebsites: [],
    patternInsightState: {
      shownInsightIdsByDate: {},
    },
    activeTimer: null,
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
        "screenshot-gratitude",
        QID.GR1,
        QuestionCategoryId.Gratitude,
        "I'm grateful for the quiet before everyone else wakes up.",
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

const getDragObjectName = (theme: ScreenshotTheme): "sun" | "moon" =>
  theme === "dark" ? "moon" : "sun";

const BrowserChrome = (props: { isTabClosed: boolean; site: BrowserSite }) => (
  <div
    class={styles.browserChrome}
    classList={{ [styles.isTabClosed]: props.isTabClosed }}
    aria-hidden="true"
  >
    <div class={styles.windowControls}>
      <span />
      <span />
      <span />
    </div>
    <div class={`${styles.browserTab} ${styles.previousBrowserTab}`}>
      <span class={styles.newTabMark}>+</span>
      <span>New Tab</span>
    </div>
    <div class={`${styles.browserTab} ${styles.currentBrowserTab}`}>
      <span
        class={styles.browserSiteValue}
        classList={{ [styles.isVisible]: props.site === "youtube" }}
      >
        <span class={styles.youtubeTabMark}>▶</span>
        <span>YouTube</span>
      </span>
      <span
        class={styles.browserSiteValue}
        classList={{ [styles.isVisible]: props.site === "reddit" }}
      >
        <span class={styles.redditTabMark}>r/</span>
        <span>Reddit</span>
      </span>
      <span
        class={styles.browserSiteValue}
        classList={{ [styles.isVisible]: props.site === "x" }}
      >
        <span class={styles.xTabMark}>X</span>
        <span>X</span>
      </span>
      <span
        class={styles.browserSiteValue}
        classList={{ [styles.isVisible]: props.site === "tiktok" }}
      >
        <span class={styles.tiktokTabMark}>♪</span>
        <span>TikTok</span>
      </span>
      <span
        class={styles.browserSiteValue}
        classList={{ [styles.isVisible]: props.site === "instagram" }}
      >
        <span class={styles.tabMark}>◎</span>
        <span>Instagram</span>
      </span>
    </div>
    <div class={styles.addressBar}>
      <span class={styles.addressLock}>●</span>
      <span
        class={styles.currentAddress}
        classList={{ [styles.isVisible]: props.site === "youtube" }}
      >
        youtube.com
      </span>
      <span
        class={styles.currentAddress}
        classList={{ [styles.isVisible]: props.site === "reddit" }}
      >
        reddit.com
      </span>
      <span
        class={styles.currentAddress}
        classList={{ [styles.isVisible]: props.site === "x" }}
      >
        x.com
      </span>
      <span
        class={styles.currentAddress}
        classList={{ [styles.isVisible]: props.site === "tiktok" }}
      >
        tiktok.com
      </span>
      <span
        class={styles.currentAddress}
        classList={{ [styles.isVisible]: props.site === "instagram" }}
      >
        instagram.com
      </span>
      <span class={styles.previousAddress}>Search or enter address</span>
    </div>
    <div class={styles.browserActions}>☆ ···</div>
  </div>
);

const BrowserNewTabShot = (props: { isVisible: boolean }) => (
  <div
    class={styles.browserNewTab}
    classList={{ [styles.isVisible]: props.isVisible }}
    aria-hidden="true"
  >
    <div class={styles.newTabContent}>
      <div class={styles.newTabLogo}>+</div>
      <div class={styles.newTabSearch}>Search or enter address</div>
    </div>
  </div>
);

const BrowserInstagramContent = () => (
  <>
    <header class={styles.socialNav}>
      <div class={styles.socialNavInner}>
        <div class={styles.socialBrand}>Instagram</div>
        <div class={styles.socialSearch}>Search</div>
        <div class={styles.socialNavActions}>
          <span>⌂</span>
          <span>♡</span>
          <span class={styles.profileDot} />
        </div>
      </div>
    </header>

    <main class={styles.socialLayout} aria-label="Instagram-like demo feed">
      <section class={styles.feedColumn}>
        <div class={styles.stories}>
          <div>
            <span />
            <small>maya</small>
          </div>
          <div>
            <span class={styles.storyTwo} />
            <small>noah</small>
          </div>
          <div>
            <span class={styles.storyThree} />
            <small>lin</small>
          </div>
          <div>
            <span class={styles.storyFour} />
            <small>alex</small>
          </div>
          <div>
            <span class={styles.storyFive} />
            <small>sam</small>
          </div>
        </div>

        <article class={styles.socialPost}>
          <header class={styles.postHeader}>
            <span class={`${styles.profileDot} ${styles.postAvatar}`} />
            <div>
              <strong>slow.weekends</strong>
              <small>Somewhere outside</small>
            </div>
            <span class={styles.postMore}>•••</span>
          </header>
          <div class={styles.mockPhoto} aria-label="A sunset by the water" />
          <div class={styles.postActions}>
            <span>♡</span>
            <span>◯</span>
            <span>⌁</span>
          </div>
          <div class={styles.postCopy}>
            <strong>1,248 likes</strong>
            <p>
              <b>slow.weekends</b> nowhere else to be.
            </p>
          </div>
        </article>
      </section>

      <aside class={styles.socialSidebar}>
        <div class={styles.sidebarProfile}>
          <span class={`${styles.profileDot} ${styles.sidebarAvatar}`} />
          <div>
            <strong>jules</strong>
            <small>Jules</small>
          </div>
        </div>
        <div class={styles.suggestionTitle}>Suggested for you</div>
        <div class={styles.suggestion}>
          <span class={styles.storyTwo} />
          <b>outside.daily</b>
          <em>Follow</em>
        </div>
        <div class={styles.suggestion}>
          <span class={styles.storyFour} />
          <b>small.rituals</b>
          <em>Follow</em>
        </div>
        <div class={styles.suggestion}>
          <span class={styles.storyFive} />
          <b>quiet.frames</b>
          <em>Follow</em>
        </div>
      </aside>
    </main>
  </>
);

const BrowserInstagramShot = () => (
  <div id="minded-6622-coloured-wrapper" class={styles.browserInstagram}>
    <BrowserInstagramContent />
  </div>
);

const BrowserRedditContent = () => (
  <>
    <header class={styles.redditHeader}>
      <div class={styles.redditBrand}>
        <span>●</span> reddit
      </div>
      <div class={styles.redditSearch}>⌕&nbsp;&nbsp; Search Reddit</div>
      <div class={styles.redditUser}>＋ Create&nbsp;&nbsp;&nbsp; ◉</div>
    </header>
    <div class={styles.redditLayout}>
      <aside class={styles.redditNavigation}>
        <b>⌂&nbsp;&nbsp;Home</b>
        <span>↗&nbsp;&nbsp;Popular</span>
        <small>COMMUNITIES</small>
        <span>r/todayilearned</span>
        <span>r/interesting</span>
        <span>r/AskReddit</span>
      </aside>
      <main class={styles.redditFeed}>
        <h2>Popular</h2>
        <article>
          <div class={styles.redditVotes}>
            ▲<b>18k</b>▼
          </div>
          <div>
            <small>r/todayilearned · 3 hr. ago</small>
            <h3>Just learned this and had to keep scrolling</h3>
            <div class={`${styles.redditImage} ${styles.redditImageOne}`} />
            <span>◯ 842 comments&nbsp;&nbsp;&nbsp; ↗ Share</span>
          </div>
        </article>
        <article>
          <div class={styles.redditVotes}>
            ▲<b>9k</b>▼
          </div>
          <div>
            <small>r/interesting · 12 min. ago</small>
            <h3>One more post before getting back to the day</h3>
            <span>◯ 316 comments&nbsp;&nbsp;&nbsp; ↗ Share</span>
          </div>
        </article>
      </main>
    </div>
  </>
);

const BrowserTiktokContent = () => (
  <div class={styles.tiktokLayout}>
    <aside class={styles.tiktokNavigation}>
      <div class={styles.tiktokBrand}>♪ TikTok</div>
      <b>⌂&nbsp;&nbsp;For You</b>
      <span>⌕&nbsp;&nbsp;Explore</span>
      <span>☷&nbsp;&nbsp;Following</span>
      <span>◯&nbsp;&nbsp;Friends</span>
      <span>☁&nbsp;&nbsp;Upload</span>
      <span>◉&nbsp;&nbsp;Profile</span>
    </aside>
    <main class={styles.tiktokFeed}>
      <div class={styles.tiktokVideo}>
        <div class={styles.tiktokScene} />
        <div class={styles.tiktokCopy}>
          <b>@somewhereoutside</b>
          <p>wait for the view at the end</p>
          <span>♪ original sound</span>
        </div>
        <div class={styles.tiktokActions}>
          <span>
            ◉<small>482K</small>
          </span>
          <span>
            ♥<small>73K</small>
          </span>
          <span>
            ●<small>1,903</small>
          </span>
          <span>
            ↗<small>Share</small>
          </span>
        </div>
      </div>
    </main>
  </div>
);

const BrowserSocialPileShot = (props: { site: BrowserSite }) => (
  <div
    id="minded-video-social-pile"
    class={styles.socialPile}
    classList={{
      [styles.isYoutubePile]: props.site === "youtube",
      [styles.isRedditPile]: props.site === "reddit",
      [styles.isXPile]: props.site === "x",
      [styles.isTiktokPile]: props.site === "tiktok",
      [styles.isInstagramPile]: props.site === "instagram",
    }}
    aria-label="Social media switching demo"
  >
    <div
      class={`${styles.socialPilePage} ${styles.instagramPage} ${styles.browserInstagram}`}
    >
      <BrowserInstagramContent />
    </div>

    <div class={`${styles.socialPilePage} ${styles.tiktokPage}`}>
      <BrowserTiktokContent />
    </div>

    <div class={`${styles.socialPilePage} ${styles.xPage}`}>
      <div class={styles.xLayout}>
        <aside class={styles.xNavigation}>
          <div class={styles.xLogo}>X</div>
          <div>⌂&nbsp;&nbsp;Home</div>
          <div>⌕&nbsp;&nbsp;Explore</div>
          <div>♡&nbsp;&nbsp;Notifications</div>
          <div>✉&nbsp;&nbsp;Messages</div>
        </aside>
        <main class={styles.xFeed}>
          <header>
            <b>For you</b>
            <span>Following</span>
          </header>
          <article>
            <span class={`${styles.profileDot} ${styles.xAvatar}`} />
            <div>
              <b>small moments</b> <small>@smallmoments · 2m</small>
              <p>one more thing before getting back to the day</p>
              <div class={styles.xPostImage} />
              <div class={styles.xPostActions}>
                ○ 148&nbsp;&nbsp; ♡ 1.2K&nbsp;&nbsp; ↗
              </div>
            </div>
          </article>
          <article>
            <span class={`${styles.profileDot} ${styles.xAvatar}`} />
            <div>
              <b>daily notes</b> <small>@dailynotes · 5m</small>
              <p>the feed keeps going. and going.</p>
            </div>
          </article>
        </main>
        <aside class={styles.xTrends}>
          <b>What’s happening</b>
          <small>Trending</small>
          <strong>For you</strong>
          <small>Popular now</small>
          <strong>Another update</strong>
        </aside>
      </div>
    </div>

    <div class={`${styles.socialPilePage} ${styles.redditPage}`}>
      <BrowserRedditContent />
    </div>

    <div class={`${styles.socialPilePage} ${styles.youtubePage}`}>
      <header class={styles.youtubeHeader}>
        <div class={styles.youtubeBrand}>
          <span>▶</span> YouTube
        </div>
        <div class={styles.youtubeSearch}>Search</div>
        <div>＋&nbsp;&nbsp; ◯</div>
      </header>
      <div class={styles.youtubeLayout}>
        <aside class={styles.youtubeNavigation}>
          <div>⌂&nbsp;&nbsp;Home</div>
          <div>▶&nbsp;&nbsp;Shorts</div>
          <div>▣&nbsp;&nbsp;Subscriptions</div>
          <div>◷&nbsp;&nbsp;History</div>
        </aside>
        <main class={styles.youtubeFeed}>
          <h2>Recommended</h2>
          <div class={styles.youtubeGrid}>
            <article>
              <div class={`${styles.videoThumb} ${styles.videoOne}`}>
                <small>12:48</small>
              </div>
              <b>Things worth seeing today</b>
              <span>new every hour · 84K views</span>
            </article>
            <article>
              <div class={`${styles.videoThumb} ${styles.videoTwo}`}>
                <small>8:12</small>
              </div>
              <b>You won’t believe what happened</b>
              <span>recommended · 211K views</span>
            </article>
            <article>
              <div class={`${styles.videoThumb} ${styles.videoThree}`}>
                <small>22:03</small>
              </div>
              <b>One more video before you go</b>
              <span>watch next · 59K views</span>
            </article>
            <article>
              <div class={`${styles.videoThumb} ${styles.videoFour}`}>
                <small>15:21</small>
              </div>
              <b>The update everyone is watching</b>
              <span>trending · 126K views</span>
            </article>
          </div>
        </main>
      </div>
    </div>

    <div
      class={styles.loopCaption}
      classList={{ [styles.isVisible]: props.site !== "youtube" }}
      aria-hidden={props.site === "youtube"}
    >
      Stuck in a loop?
    </div>
  </div>
);

const BrowserInterventionFlow = () => {
  let wrapperEl: HTMLDivElement = undefined!;

  return (
    <>
      <BrowserInstagramShot />
      <div
        id="minded-6622-coloured-wrapper-dynamic"
        class={styles.browserIntervention}
        style={{ opacity: "1" }}
        ref={(element) => {
          wrapperEl = element;
        }}
      >
        <InteractionCommon
          questionForPrompt={getQuestion(
            QuestionCategoryId.HealthierBrowsingHabits,
            QID.HBH6,
          )}
          isInitFadeout={false}
          wrapperEl={wrapperEl}
          interactionTarget={{ kind: "host", id: "instagram.com" }}
          interactionPlatform="web"
          onAfterInteractionFadeout={() => undefined}
          onSetAnswer={() => undefined}
          onUpdateQuestion={() => undefined}
          onModeSet={() => undefined}
          onSkip={() => undefined}
          onFlingAway={() => undefined}
          onDragComplete={() => undefined}
        />
      </div>
    </>
  );
};

const DraggableSunShot = (props: { theme: ScreenshotTheme }) => {
  const dragObjectName = getDragObjectName(props.theme);

  return (
    <div class={styles.draggableSunShot}>
      <BackgroundTransition dragThreshold={0.3} isSunGradientAttached={true} />
      <div class={styles.draggableSunContent}>
        <div class="sun-instructions txtSmaller">
          <p class="sun-instructions-line is-visible">
            Drag the {dragObjectName} down - or fling it away - to let go.
          </p>
          <p class="sun-instructions-line is-visible">
            Tap the {dragObjectName} 3 times to continue.
          </p>
        </div>

        <div
          class="sun-container"
          style={{ opacity: 1, "pointer-events": "all" }}
        >
          <Sun
            variant={dragObjectName}
            onDragComplete={() => undefined}
            onFlingAway={() => undefined}
            onSkip={() => undefined}
            tapThreshold={3}
          />
        </div>
      </div>
    </div>
  );
};

const Screenshots = (): JSX.Element => {
  const initialTarget = getScreenshotTarget();
  const [target, setTarget] = createSignal(initialTarget);
  const [browserSite, setBrowserSite] = createSignal<BrowserSite>("youtube");
  const [isBrowserTabClosed, setIsBrowserTabClosed] = createSignal(false);
  const theme = getScreenshotTheme();
  const platform = getScreenshotPlatform();
  const isBrowserVideo = getIsBrowserVideo();

  (window as any).IS_MAIN_MINDED_6622 = true;
  (window as any).__MINDED_SCREENSHOT_SYNC_DATA__ = createScreenshotSyncData();
  (window as any).__MINDED_SCREENSHOT_LOCAL_DATA__ = {
    hostsData: {},
    littleSunHintSeen: true,
  };
  (window as any).__MINDED_SCREENSHOT_READY__ = false;
  sessionStorage.setItem("dashboardGroupShown", "true");

  if (initialTarget === "dashboard") {
    setDashboardRandomSequence();
  }

  onMount(() => {
    (window as any).__MINDED_SET_BROWSER_SITE__ = (nextSite: string) => {
      if (!BROWSER_SITES.includes(nextSite as BrowserSite)) {
        throw new Error(`Unknown browser site: ${nextSite}`);
      }

      setBrowserSite(nextSite as BrowserSite);
    };
    (window as any).__MINDED_CLOSE_BROWSER_TAB__ = () => {
      setIsBrowserTabClosed(true);
    };
    (window as any).__MINDED_SET_SCREENSHOT_TARGET__ = (nextTarget: string) => {
      if (!SCREENSHOT_TARGETS.includes(nextTarget as ScreenshotTarget)) {
        throw new Error(`Unknown screenshot target: ${nextTarget}`);
      }

      (window as any).__MINDED_SCREENSHOT_READY__ = false;
      setTarget(nextTarget as ScreenshotTarget);
      window.requestAnimationFrame(() => {
        applyScreenshotTheme(theme, platform);
        (window as any).__MINDED_SCREENSHOT_READY__ = true;
      });
    };
    applyScreenshotTheme(theme, platform);
    markReadyAfterPaint(theme, platform);
  });

  if (initialTarget === "dashboard") {
    return <RoutesCmp />;
  }

  return (
    <>
      {target() === "browser-social" ? (
        <BrowserSocialPileShot site={browserSite()} />
      ) : target() === "browser-intervention" ? (
        <BrowserInterventionFlow />
      ) : (
        <ScreenshotSurface theme={theme}>
          {target() === "energy-lvl" && (
            <EnergyLvlInteraction
              onSuccess={() => undefined}
              onSkip={() => undefined}
              onCancelCountdown={() => undefined}
            />
          )}

          {target() === "draggable-sun" && <DraggableSunShot theme={theme} />}

          {target() === "intent-selection" && (
            <PostSunFlowFrame>
              <IntentSelection
                isArmed={true}
                onCancel={() => undefined}
                onCancelCountdown={() => undefined}
                onSelectIntent={() => undefined}
              />
            </PostSunFlowFrame>
          )}

          {target() === "duration-selection" && (
            <PostSunFlowFrame>
              <TimeSelection
                intent={SCREENSHOT_SESSION_INTENT}
                isArmed={true}
                onCancel={() => undefined}
                onSelectTime={() => undefined}
              />
            </PostSunFlowFrame>
          )}

          {target() === "q-something-i-am-looking-forward-to" && (
            <ScreenshotQuestion
              question={getQuestion(
                QuestionCategoryId.GoodPlansToday,
                QID.GPT6,
              )}
            />
          )}

          {target() === "q-this-week-i-will-do-my-best-to" && (
            <ScreenshotQuestion
              question={getQuestion(QuestionCategoryId.GoalForTheWeek, QID.GW2)}
            />
          )}
        </ScreenshotSurface>
      )}
      {isBrowserVideo && (
        <>
          <BrowserNewTabShot isVisible={isBrowserTabClosed()} />
          <BrowserChrome
            isTabClosed={isBrowserTabClosed()}
            site={browserSite()}
          />
        </>
      )}
    </>
  );
};

export default Screenshots;
