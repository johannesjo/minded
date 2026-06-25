import { createSignal, onCleanup, onMount, Show } from "solid-js";
import type { JSX } from "solid-js";
import styles from "./MissingCapabilities.module.scss";
import {
  ANDROID_EV_RESUME,
  androidInterface,
} from "@src/dataInterface/android/androidInterface";
import { safeJsonParse } from "@src/util/safeJsonParse";
import Btn from "@src/shared/components/ui/Btn";

// Capabilities minded cannot run without. Usage-access and battery-optimization
// are advisory - they improve detection reliability but must NOT block
// onboarding completion or the "fully configured" state - so they are
// intentionally excluded here while still being surfaced as fixable cards below.
const REQUIRED_CAPABILITIES = ["Accessibility", "SystemAlertWindow"];

// Advisory capabilities - granting them improves detection reliability, but
// minded works without them (accessibility + overlay are enough). They are
// rendered below the required ones and clearly flagged as optional so users
// don't mistake them for mandatory setup steps.
const OPTIONAL_CAPABILITIES = ["UsageStats", "BatteryOptimization"];

// How long a granted card takes to glide out. Matches --dur-soft so the JS
// unmount lines up with the CSS collapse — the card finishes easing away exactly
// as we drop it from the list (and as 0ms under reduced-motion, it's instant).
const EXIT_MS = 480;

export const MissingCapabilityView = (props: {
  onAllConfigured?: () => void;
  onPermissionDenied?: () => void;
  // When true, show only the required capabilities (accessibility + overlay) and
  // gate onAllConfigured on them. Used by the first onboarding permission step so
  // the optional extras don't crowd the first impression or block completion.
  requiredOnly?: boolean;
  // When true, show only the advisory capabilities (usage-access,
  // battery-optimization). Used by the dedicated optional onboarding step that
  // follows the required one; never blocks - the user can always continue.
  optionalOnly?: boolean;
}) => {
  const [getIsShowManualInstructions, setIsShowManualInstructions] =
    createSignal<boolean>(false);

  const [getMissingCapabilities, setMissingCapabilities] = createSignal<
    string[]
  >([]);
  const [getCanContinue, setCanContinue] = createSignal<boolean>(false);

  // Capabilities just granted and now gliding out: kept mounted so the
  // collapse/fade can play (see EXIT_MS), then dropped from the list.
  const [getExiting, setExiting] = createSignal<Set<string>>(new Set());
  let t0: NodeJS.Timeout | undefined;

  // Pending exit/advance timers, cleared on unmount so a late tap (e.g. "maybe
  // later" mid-animation) can't fire onAllConfigured after we've navigated away.
  const timers = new Set<NodeJS.Timeout>();
  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };

  const refreshMissingCapabilities = () => {
    const mc = safeJsonParse<string[]>(
      androidInterface.getMissingCapabilities(),
      [],
    );

    // Cards for just-granted capabilities glide out instead of vanishing: keep
    // them mounted via the exiting set so the CSS collapse can run, then drop
    // them once it has finished (EXIT_MS).
    const newlyGranted = getMissingCapabilities().filter(
      (c) => !mc.includes(c),
    );
    if (newlyGranted.length) {
      setExiting((prev) => new Set([...prev, ...newlyGranted]));
      later(() => {
        setExiting((prev) => {
          const next = new Set(prev);
          newlyGranted.forEach((c) => next.delete(c));
          return next;
        });
      }, EXIT_MS);
    }

    // A capability that's missing again before its exit finished (granted then
    // re-revoked within EXIT_MS) must leave the exiting set at once, so it shows
    // straight away instead of staying collapsed — a re-revoke must not hard-pop.
    // Keeps the invariant: exiting ⊆ not-currently-missing.
    setExiting((prev) =>
      [...prev].some((c) => mc.includes(c))
        ? new Set([...prev].filter((c) => !mc.includes(c)))
        : prev,
    );

    setMissingCapabilities(mc);

    // On the auto-advancing screens, hold the navigation until the last card has
    // finished gliding out, so completing the step never cuts the animation off.
    // Capture the callback now (synchronously) so the deferred timer doesn't read
    // props after the fact.
    const onAllConfigured = props.onAllConfigured;
    const finishAfterExit = () =>
      newlyGranted.length
        ? later(() => onAllConfigured?.(), EXIT_MS)
        : onAllConfigured?.();

    // Optional step: nothing here blocks, so Continue is always available. Once
    // the user has granted (or already had) every optional capability there is
    // nothing left to offer, so move straight on to completion.
    if (props.optionalOnly) {
      const optionalMissing = mc.filter((c) =>
        OPTIONAL_CAPABILITIES.includes(c),
      );
      setCanContinue(true);
      if (optionalMissing.length === 0) {
        finishAfterExit();
      }
      return;
    }

    const blockingMissing = props.requiredOnly
      ? mc.filter((c) => REQUIRED_CAPABILITIES.includes(c))
      : mc;
    setCanContinue(blockingMissing.length === 0);

    // Onboarding (requiredOnly) surfaces a Continue button instead of
    // auto-advancing: granting the required permissions must not skip past the
    // optional/recommended ones before the user can act on them. Elsewhere
    // (e.g. the dashboard banner) the view still auto-closes once everything
    // is resolved.
    if (blockingMissing.length === 0 && !props.requiredOnly) {
      finishAfterExit();
    }
  };

  onMount(() => {
    refreshMissingCapabilities();

    const resumeHandler = () => {
      refreshMissingCapabilities();
    };
    window.addEventListener(ANDROID_EV_RESUME, resumeHandler);

    onCleanup(() => {
      window.removeEventListener(ANDROID_EV_RESUME, resumeHandler);
    });
  });

  const isExiting = (cap: string) => getExiting().has(cap);

  // A card stays on screen while its capability is still missing or mid-exit.
  const isVisible = (cap: string) =>
    getMissingCapabilities().includes(cap) || isExiting(cap);

  const hasOptionalVisible = () =>
    OPTIONAL_CAPABILITIES.some((c) => isVisible(c));

  // Positive confirmation once every required capability is granted — shown only
  // on the requiredOnly step, where the user lingers to press Continue (the
  // optional step hands off to the celebratory "sun is ready" screen instead).
  // Held back until the last required card has finished exiting so the card and
  // the confirmation never cross over.
  const showConfirmation = () =>
    !!props.requiredOnly &&
    REQUIRED_CAPABILITIES.every((c) => !getMissingCapabilities().includes(c)) &&
    !REQUIRED_CAPABILITIES.some((c) => isExiting(c));

  const onMissingCapabilityClick = (capability: string) => {
    t0 = setTimeout(() => {
      setIsShowManualInstructions(true);
    }, 1000);
    androidInterface.onMissingCapabilityClick(capability);
  };

  onCleanup(() => {
    window.clearTimeout(t0);
    timers.forEach((id) => clearTimeout(id));
    timers.clear();
  });

  // Wraps each permission card in a collapsing slot so granting it glides the
  // card away (and eases the cards below up) instead of a hard pop.
  const PermissionCard = (cardProps: {
    capability: string;
    children: JSX.Element;
  }) => (
    <Show when={isVisible(cardProps.capability)}>
      <div
        classList={{
          [styles.cardSlot]: true,
          [styles.cardSlotExiting]: isExiting(cardProps.capability),
        }}
      >
        <div class="card">{cardProps.children}</div>
      </div>
    </Show>
  );

  return (
    <div class={styles.container + " pageTransitionIn"}>
      <div class={styles.innerContainer}>
        <Show
          when={showConfirmation()}
          fallback={
            <div class="txtSlightlyBigger">
              {props.optionalOnly ? (
                <>
                  You're all set. These extras are optional — they just help the
                  sun appear more reliably. Add them now or skip; you can always
                  do it later.
                </>
              ) : (
                <>
                  <em>minded</em> displays an overlay when you open one of the
                  configured apps. For this to work you need to give us
                  permission.
                </>
              )}
            </div>
          }
        >
          <div class={`${styles.confirmation} pageTransitionIn`}>
            <span class={styles.confirmCheck} aria-hidden="true">
              ✓
            </span>
            <span class="txtSlightlyBigger">Permissions granted.</span>
          </div>
        </Show>
        {/*<div*/}
        {/*  class="txtSlightlyBigger"*/}
        {/*  style="margin-top: 16px; margin-bottom: 32px;"*/}
        {/*>*/}
        {/*  <strong>*/}
        {/*    <em>minded</em> does not collect or send any kind of information!*/}
        {/*  </strong>*/}
        {/*</div>*/}
        <Show when={!props.optionalOnly}>
          <PermissionCard capability="Accessibility">
            <p class={styles.permissionText}>
              <em>minded</em> uses accessibility capabilities only to detect the
              app that is currently in the foreground, so <em>minded</em> can
              display its interaction overlay for the apps you configured.
            </p>
            {/*<p class={styles.permissionText "}>*/}
            {/*  <em>minded</em> does not collect any kind of information and does*/}
            {/*  not send any kind of information.*/}

            {/*Enabling the shortcut is{" "}*/}
            {/*<strong>not</strong> required or recommended.*/}
            {/*</p>*/}
            <Btn onClick={() => onMissingCapabilityClick("Accessibility")}>
              Enable Accessibility Service
            </Btn>

            {getIsShowManualInstructions() && (
              <>
                <p class={styles.smallText}>
                  If the buttons above does not work, you can enable the
                  accessibility service and the permission manually in your
                  device settings.
                </p>
                <p class={styles.smallText}>
                  In case there are problems with the accessibility service,
                  enabling, disabling and then enabling the service again will
                  likely help.
                </p>
              </>
            )}
          </PermissionCard>

          <PermissionCard capability="SystemAlertWindow">
            <p class={styles.permissionText}>
              To display its overlays, <em>minded </em>needs the overlay
              permission.
            </p>
            <Btn onClick={() => onMissingCapabilityClick("SystemAlertWindow")}>
              Enable Overlay Permission
            </Btn>
          </PermissionCard>
        </Show>
        {/* Optional capabilities are deferred during the required onboarding
            step (requiredOnly) so a first-run user meets two cards, not four.
            They get their own dedicated step afterwards (optionalOnly), and
            also surface via the dashboard's missing-permissions banner. */}
        <Show when={!props.requiredOnly && hasOptionalVisible()}>
          <div class={styles.optionalSection}>
            {!props.optionalOnly && (
              <p class={styles.optionalHeading}>
                Recommended. <em>minded</em> already works with the permissions
                above; the steps below are optional and make detection more
                reliable.
              </p>
            )}
            <PermissionCard capability="UsageStats">
              <span class={styles.optionalBadge}>Optional</span>
              <p class={styles.permissionText}>
                <em>minded</em> uses usage access as a backup way to detect the
                app in the foreground. Without it, detection is less reliable
                for apps with long loading screens.
              </p>
              <Btn onClick={() => onMissingCapabilityClick("UsageStats")}>
                Enable Usage Access
              </Btn>
            </PermissionCard>
            <PermissionCard capability="BatteryOptimization">
              <span class={styles.optionalBadge}>Optional</span>
              <p class={styles.permissionText}>
                Battery optimization can silently stop <em>minded</em> in the
                background, so interventions no longer appear. Excluding{" "}
                <em>minded</em> from battery optimization keeps the protection
                running.
              </p>
              <Btn
                onClick={() => onMissingCapabilityClick("BatteryOptimization")}
              >
                Disable Battery Optimization
              </Btn>
            </PermissionCard>
          </div>
        </Show>

        {(props.requiredOnly || props.optionalOnly) && getCanContinue() && (
          <Btn
            big
            style={{ "margin-top": "32px" }}
            onClick={() => props.onAllConfigured?.()}
          >
            continue
          </Btn>
        )}

        {/* The optional step never blocks - its always-available Continue is the
            skip - so it omits the declining opt-out shown on the required step. */}
        {!props.optionalOnly && (
          <Btn
            outline
            style={{ "margin-top": "32px" }}
            onClick={() => props.onPermissionDenied?.()}
          >
            maybe later
          </Btn>
        )}

        <p class={styles.privacyNote}>
          Everything stays on your device. Nothing is ever sent anywhere.
        </p>
      </div>
    </div>
  );
};
