import {
  type BeforeLeaveEventArgs,
  HashRouter,
  Route,
  RouteSectionProps,
  useBeforeLeave,
  useLocation,
  useSearchParams,
} from "@solidjs/router";
import { fadeOutCurrentPage } from "@src/util/animation";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";
import { Dashboard } from "@src/shared/components/dashboard/Dashboard";
import {
  createEffect,
  createSignal,
  JSX,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import {
  addWrapperClasses,
  isDarkModeNow,
} from "@src/shared/addWrapperClasses";
import Sun from "@src/shared/components/interaction/sun/Sun";
import {
  getIsShellSunHidden,
  getIsSunHandoffInFlight,
  getSunHandlers,
  getSunOrbit,
  getSunRole,
  getSunSettleForCurrentRole,
  isShellSunInteractive,
  setBreathStartedAt,
  setCompanionBottomYPx,
  setSunRole,
} from "@src/shared/components/interaction/sun/sunStore";
import { readCompanionBottomPx } from "@src/shared/components/interaction/sun/companionAnchor";
import { QuestionCategoryView } from "@src/shared/components/questionCategoryView/QuestionCategoryView";

import {
  IS_ANDROID,
  IS_IOS,
  IS_WEB_EXT,
} from "@src/dataInterface/commonSyncDataInterface";

import Feedback from "@src/shared/components/feedback/Feedback";
import BottomBar from "@src/shared/components/bottomBar/BottomBar";
import InteractionOverlay from "@src/shared/components/dashboard/interactionOverlay/InteractionOverlay";
import { REFRESH_DASHBOARD_EV } from "@src/ev.const";
import { SettingsAndroidRoute } from "@src/android/components/settingsAndroid/SettingsAndroidRoute";
import { SettingsWebRoute } from "@src/pages/newtab/components/settingsWebRoute/SettingsWebRoute";
// @ts-ignore
import styles from "./RouteCmp.module.scss";
import DailyQuestions from "@src/shared/components/dailyQuestions/DailyQuestions";
import InteractionIOS from "@src/ios/interaction/InteractionIOS";
import SleepWindDownRoute from "@src/shared/components/sleepWindDown/SleepWindDownRoute";
import Styleguide from "@src/shared/components/styleguide/Styleguide";

// Vite replaces process.env.NODE_ENV at build time. `npm start` sets NODE_ENV=development,
// so the styleguide route registers (and the import is kept). `npm run build` defaults to
// production, so this evaluates to false and Rollup tree-shakes the import out.
const IS_DEV: boolean = process.env.NODE_ENV !== "production";

const MainWrapper = (props: RouteSectionProps) => {
  // A widget cold-start arrives with `?sun=open` already in the hash. Read it
  // synchronously here so the interaction overlay is part of the FIRST render —
  // otherwise the dashboard paints for a frame before a post-mount effect could
  // open it. (Warm re-taps are handled by the effect below.)
  const [searchParams, setSearchParams] = useSearchParams();
  const openedFromWidgetAtLaunch = searchParams.sun === "open";

  // The widget's prompt card passes the exact line it was showing (`&widgetLine=`)
  // so the interaction lands on that same NOTICE/ACTION_ADVICE rather than a
  // random pick. A repeated key would arrive as an array; take the single value.
  const readWidgetLine = (): string | undefined =>
    typeof searchParams.widgetLine === "string"
      ? searchParams.widgetLine
      : undefined;

  const [getIsShowQuestionOverlay, setIsShowQuestionOverlay] =
    createSignal<boolean>(openedFromWidgetAtLaunch);
  // The widget line to open on, held past the URL-param clear below so the overlay
  // still mounts with it. Cleared when the overlay closes and on an in-app
  // companion tap, so neither reuses a stale line.
  const [getWidgetLine, setWidgetLine] = createSignal<string | undefined>(
    openedFromWidgetAtLaunch ? readWidgetLine() : undefined,
  );
  // Open with no entrance fade when it came from the widget, so we land straight
  // in the interaction instead of fading the dashboard out behind it. A normal
  // companion tap keeps the gentle fade.
  const [getIsOverlayInstant, setIsOverlayInstant] = createSignal<boolean>(
    openedFromWidgetAtLaunch,
  );
  // Pointer hover over the resting companion (relayed from its tap target, since
  // the disc itself is pointer-transparent) — lifts + glows the sun.
  const [getIsCompanionHovered, setIsCompanionHovered] =
    createSignal<boolean>(false);

  const location = useLocation();
  const isDashboard = () => location.pathname === "/";
  // Day/night for the sun. Seed from the time-based rule for the first paint,
  // then (in onMount) mirror the actual `.minded-6622-dark` class — reactively,
  // via a MutationObserver — so the companion can never disagree with the
  // rendered theme. The class is the single source of truth and it *can* flip
  // after mount without a reload: on Android a background→resume across the
  // day/night threshold re-runs setIsDarkModeIfApplies (MainAndroid's refresh),
  // toggling the class on the live wrapper. A one-shot read left the disc on the
  // moon (or sun) until restart; observing the class flips the variant with it.
  const [getSunVariant, setSunVariant] = createSignal<"sun" | "moon">(
    isDarkModeNow() ? "moon" : "sun",
  );

  // The disc is interactive only while the role is "interactive" AND no hand-off
  // to the post-sun choices is in flight — otherwise the centred, full-size disc
  // (z-30, above the overlay) would grab taps meant for the choices that mount
  // before the deferred role flip (see getIsSunHandoffInFlight).
  const isSunInteractive = () =>
    isShellSunInteractive(getSunRole(), getIsSunHandoffInFlight());

  // const navigate = useNavigate();

  // One place makes every page-to-page route change fade out before the next
  // eases in, so the soft transition is the default and can't be forgotten at a
  // call site (this replaces the old per-navigate `navigateWithPageFadeOut`
  // wrapping). On each navigation we fade the leaving page's own node fully out,
  // then `retry(true)` so it goes through without re-entering this guard; the
  // route remounts and discards the faded node, and the destination eases in via
  // its own pageTransitionIn. Skipped for:
  //  - browser/hardware back+forward: leave those instant — fading would add
  //    latency and force the router's block-then-restore history bounce on
  //    every press. Only a *backward* move arrives as a numeric history delta;
  //    the router hands a forward move over as a plain path string, so history
  //    moves are recognised by the hash already pointing at the destination
  //    (a popstate/hashchange changed the URL before this guard runs, whereas
  //    an in-app navigate() fires it while the URL still shows the old route).
  //  - same-path changes (query-only, e.g. clearing `?sun=open`): the route node
  //    isn't remounted, so fading it would strand it at opacity 0.
  //  - reduced motion, and navigations that already faded their own surface
  //    (wind-down dismiss passes `state.skipPageFade`).
  let isPageFading = false;
  // The navigation to run once the in-flight fade lands. A second tap during
  // the fade replaces it (the newest intent wins instead of being swallowed); a
  // history move during the fade clears it (the user navigated away themselves,
  // so re-pushing the faded-out destination would override their back press).
  let pendingRetry: (() => void) | null = null;
  const normalizeHashPath = (s: string): string => s.replace(/^#/, "") || "/";
  useBeforeLeave((e: BeforeLeaveEventArgs) => {
    const state = e.options?.state as { skipPageFade?: boolean } | undefined;
    if (
      typeof e.to !== "string" ||
      normalizeHashPath(e.to) === normalizeHashPath(window.location.hash)
    ) {
      // A history move (back delta, or the hash already points at the
      // destination) — instant, and it drops any queued retry.
      pendingRetry = null;
      return;
    }
    if (e.defaultPrevented || prefersReducedMotion() || state?.skipPageFade)
      return;
    if (e.to.split(/[?#]/)[0] === e.from.pathname) return;

    e.preventDefault();
    pendingRetry = () => e.retry(true);
    // A fade is already mid-flight (double-tap, or a quick second tap on a
    // different card) — the pending retry above hands it the newest target.
    if (isPageFading) return;

    isPageFading = true;
    fadeOutCurrentPage().then(() => {
      isPageFading = false;
      const retry = pendingRetry;
      pendingRetry = null;
      retry?.();
    });
  });

  // The home-screen sun widget (Android now, iOS later) launches the app with
  // `?sun=open` to mirror tapping the in-app companion: it opens the very same
  // interaction overlay, and the existing flow handles the exit identically. A
  // warm re-tap (native sets the hash on the already-live page) is handled here;
  // a cold start is handled synchronously above so the overlay is in the first
  // render. The flag is cleared once consumed so a resume can't reopen it.
  createEffect(() => {
    if (searchParams.sun !== "open") return;
    // Only while the sun is resting as the companion — never cut into an
    // interaction that's already in flight.
    if (getSunRole() === "companion" && !getIsShowQuestionOverlay()) {
      setIsOverlayInstant(true);
      // Set the line before opening so the overlay mounts with it.
      setWidgetLine(readWidgetLine());
      setIsShowQuestionOverlay(true);
    }
    setSearchParams(
      { sun: undefined, widgetLine: undefined },
      { replace: true },
    );
  });

  onMount(() => {
    addWrapperClasses();
    // addWrapperClasses just set (or cleared) the dark class — read the real
    // value so the sun matches the wrapper exactly, then keep mirroring it: the
    // class can flip later without a reload (Android resume across the day/night
    // threshold), and the companion disc must follow rather than stay on the
    // moon (or sun) until restart. The class stays the single source of truth.
    const wrapperEl = document.getElementById("minded-6622");
    const syncSunVariantToWrapper = () => {
      if (!wrapperEl) return;
      setSunVariant(
        wrapperEl.classList.contains("minded-6622-dark") ? "moon" : "sun",
      );
    };
    syncSunVariantToWrapper();
    if (wrapperEl) {
      const classObserver = new MutationObserver(syncSunVariantToWrapper);
      classObserver.observe(wrapperEl, {
        attributes: true,
        attributeFilter: ["class"],
      });
      onCleanup(() => classObserver.disconnect());
    }

    // Anchor the companion sun by reading the position straight off the CSS that
    // already places the bottom-bar anchor the disc rests onto: `.companionAnchorProbe`
    // is `position: fixed; bottom: var(--companion-bar-center-y)`, so the browser has
    // resolved that var to a px `bottom` (vh against the layout viewport, plus the
    // live safe-area inset) exactly as the bottom bar's own layout did. Reading it
    // back makes the SCSS the single source of truth — the disc lands on the same
    // px the icons do, with no clamp math mirrored in JS to drift out of sync.
    //
    // This also drives the fix for the startup race: the store seeds the signal
    // with a plain default at module-eval (before mountApp runs setupAndroidInsets
    // and before, on Android, Compose has even delivered the first inset), so the
    // resting disc would otherwise sit off the settings/feedback icon line on
    // ~half of cold starts. Re-measure on mount (SolidJS runs onMount before
    // paint, so the corrected value lands with no visible glide) and again next
    // frame. The late inset itself arrives via the native WebViewSafeAreaBridge
    // push, which sets the CSS var and dispatches `androidSafeAreaChanged` (which
    // nothing else listened to) — re-measure on that so the disc catches up; when
    // it moved while the disc was already resting home, the settle snaps it there
    // in lockstep with the icons (see enterSettle's companion re-anchor branch).
    // `resize` keeps it in sync with the viewport. The probe is a permanent,
    // invisible element (unlike the tap target, which only exists while resting),
    // so a resize *during an interaction* is still captured — otherwise the disc
    // returned home to a stale anchor, off the icon line, until the next resize.
    const reanchorCompanion = () => {
      const probe = document.querySelector<HTMLElement>(
        `.${styles.companionAnchorProbe}`,
      );
      if (!probe) return;
      const bottomPx = readCompanionBottomPx(probe);
      if (bottomPx != null) setCompanionBottomYPx(bottomPx);
    };
    reanchorCompanion();
    const rafId = requestAnimationFrame(reanchorCompanion);
    window.addEventListener("resize", reanchorCompanion);
    window.addEventListener("androidSafeAreaChanged", reanchorCompanion);
    onCleanup(() => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", reanchorCompanion);
      window.removeEventListener("androidSafeAreaChanged", reanchorCompanion);
    });

    // iOS widget cold-launch only: tell the native launch overlay the sun has
    // actually painted, so it fades out on the real first paint instead of guessing
    // from page-load progress (which only signals resources finished, not render).
    // No-op elsewhere — the handler is only registered during an iOS widget launch,
    // and the optional chain makes the call harmless on Android/web/web-ext.
    if (IS_IOS && openedFromWidgetAtLaunch) {
      requestAnimationFrame(() => {
        (
          window as unknown as {
            webkit?: {
              messageHandlers?: {
                mindedSunReady?: { postMessage: (m: string) => void };
              };
            };
          }
        ).webkit?.messageHandlers?.mindedSunReady?.postMessage("ready");
      });
    }
  });

  return (
    <>
      <main
        class={styles.contentWrapper}
        classList={{ [styles.withCompanionBar]: !isDashboard() }}
      >
        {props.children}
      </main>

      {/*
        One persistent sun for the whole shell: it rests as the companion over
        the bottom bar and (Phase 2) transforms into the interactive intervention
        — never swapped for a second element. The layer is fixed + viewport-centred
        so the sun's base is screen-centre (interactive rest); the companion
        settle offsets it down to the bottom bar. Click-through except the disc /
        the companion tap-target.
        Phase 1: still hidden while the overlay shows its own sun.
      */}
      <div
        class={styles.shellSunLayer}
        classList={{
          [styles.isInteractive]: isSunInteractive(),
          // A live intervention pins the idle float still so the disc's centre
          // stays exactly on the point the background glow tracks (see the SCSS
          // note). The daily-questions phases have no such glow to track, so they
          // keep their gentle idle float.
          [styles.isIntervention]:
            getSunRole() !== "companion" &&
            getSunRole() !== "dailyQuestions" &&
            getSunRole() !== "dailyQuestionsSuccess",
          // The companion rest must sit perfectly still on the bottom-bar anchor.
          // The idle float is upward-only (0 → -4px), so it would ride the disc up
          // to 4px above the settings / feedback icons' centre line for most of
          // its cycle, reading as "sitting too high / not vertically centred". A
          // still companion also matches the no-ambient-breath rule for the soft
          // sun (it morphs into place, then rests; it doesn't inhale).
          [styles.isCompanion]: getSunRole() === "companion",
          // A dashboard offer that owns the screen has taken over (the flung-up
          // let-go question, or grounding's screen-free / Android-lock sit); hide
          // the disc behind it instead of letting it paint over the screen. It
          // returns home when the offer closes.
          [styles.isHidden]: getIsShellSunHidden() === true,
          [styles.isHiddenSoft]: getIsShellSunHidden() === "soft",
        }}
      >
        {/*
          Permanent, invisible probe pinned to the companion anchor
          (bottom: var(--companion-bar-center-y)). reanchorCompanion reads its
          resolved px so the disc lands on the exact spot the settings/feedback
          icons do. Unlike the tap target (which only mounts while resting), this
          is always present, so a resize/rotation *during* an interaction is
          still measured — the disc then returns home to the current anchor, not
          a stale one.
        */}
        <div class={styles.companionAnchorProbe} aria-hidden="true" />
        <div class={styles.shellSunSlot}>
          <Sun
            variant={getSunVariant()}
            settle={getSunSettleForCurrentRole()}
            orbit={getSunOrbit()}
            onBreathStart={setBreathStartedAt}
            minimizeWillChange={true}
            isDragEnabled={isSunInteractive()}
            isTapEnabled={
              isSunInteractive() && (getSunHandlers()?.isTapEnabled ?? true)
            }
            isHovered={getSunRole() === "companion" && getIsCompanionHovered()}
            tapThreshold={getSunHandlers()?.tapThreshold ?? 3}
            onSkip={() => getSunHandlers()?.onSkip()}
            onFlingAway={() => getSunHandlers()?.onFlingAway()}
            onDragComplete={() => getSunHandlers()?.onDragComplete()}
            onStartBackgroundAnimation={(d) =>
              getSunHandlers()?.onStartBackgroundAnimation?.(d)
            }
            onFlungOffscreen={() => getSunHandlers()?.onFlungOffscreen?.()}
            onCompletionStarted={(s) =>
              getSunHandlers()?.onCompletionStarted?.(s)
            }
          />
        </div>
        <Show
          when={
            getSunRole() === "companion" &&
            !getIsShowQuestionOverlay() &&
            // A hidden companion must not keep an invisible tap target armed
            // (e.g. while the sleep wind-down's moon owns the screen).
            !getIsShellSunHidden()
          }
        >
          <button
            type="button"
            class={styles.companionTapTarget}
            aria-label="Get asked a question"
            onMouseEnter={() => setIsCompanionHovered(true)}
            onMouseLeave={() => setIsCompanionHovered(false)}
            onClick={() => {
              // Open the overlay; the interaction measures its sun placeholder
              // and *then* flips the role, so the disc rises from the bottom bar
              // straight onto its slot in one slow glide (no base detour).
              setIsCompanionHovered(false);
              setIsOverlayInstant(false); // in-app tap keeps the gentle fade
              // A plain in-app tap is a fresh random pick — never reuse a line
              // left over from an earlier widget tap.
              setWidgetLine(undefined);
              setIsShowQuestionOverlay(true);
            }}
          />
        </Show>
      </div>

      <BottomBar />

      {getIsShowQuestionOverlay() && (
        <InteractionOverlay
          instant={getIsOverlayInstant()}
          widgetLine={getWidgetLine()}
          onPossibleNewData={() => {
            window.dispatchEvent(new Event(REFRESH_DASHBOARD_EV));
          }}
          onHideInteraction={() => {
            // The overlay (sky + choices) is gone; send the same disc gliding
            // back to its companion rest in the top bar.
            setSunRole("companion");
            // Drop any breath origin so the next pause starts from a fresh clock.
            setBreathStartedAt(undefined);
            setIsShowQuestionOverlay(false);
            setIsOverlayInstant(false);
            // Drop the widget line so a later in-app companion tap can't reopen
            // on it.
            setWidgetLine(undefined);
            // The greeting was already re-rolled when the overlay *started*
            // fading (RE_GREET_DASHBOARD_HIDDEN_EV, dispatched from the overlay),
            // so the fresh tile is in place behind it — nothing to swap here, or
            // you'd see it change a second time after the sky is gone.
          }}
        />
      )}
    </>
  );
};

const RoutesCmp = (props: { children?: JSX.Element }) => {
  return (
    <div id="minded-6622-coloured-wrapper" class={styles.mainWrapper}>
      {props.children}

      <HashRouter root={MainWrapper}>
        <Route path="*" component={() => <Dashboard />} />
        {/*
          The "show all" / look-back view: the full grid of every tile, as its
          own route so it behaves exactly like settings — the global bottom bar
          shows its back arrow (and Android's hardware back returns here) instead
          of stranding the user in the expanded grid with no way back.
        */}
        <Route path="/lookBack" component={() => <Dashboard forceRevealed />} />
        <Route
          path="/questionCategory/:questionCategoryId"
          component={QuestionCategoryView}
        />
        {IS_ANDROID && (
          <Route path="/settings" component={SettingsAndroidRoute} />
        )}
        {IS_IOS && <Route path="/interaction" component={InteractionIOS} />}
        {IS_WEB_EXT && <Route path="/settings" component={SettingsWebRoute} />}
        <Route path="/feedback" component={Feedback} />
        <Route path="/dailyQuestions" component={DailyQuestions} />
        {IS_ANDROID && (
          <Route path="/sleepWindDown" component={SleepWindDownRoute} />
        )}
        {IS_DEV && <Route path="/styleguide" component={Styleguide} />}
      </HashRouter>
    </div>
  );
};

export default RoutesCmp;
