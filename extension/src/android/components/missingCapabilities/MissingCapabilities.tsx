import { createSignal, onCleanup, onMount } from "solid-js";
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
  let t0: NodeJS.Timeout | undefined;

  const refreshMissingCapabilities = () => {
    const mc = safeJsonParse<string[]>(
      androidInterface.getMissingCapabilities(),
      [],
    );
    setMissingCapabilities(mc);

    // Optional step: nothing here blocks, so Continue is always available. Once
    // the user has granted (or already had) every optional capability there is
    // nothing left to offer, so move straight on to completion.
    if (props.optionalOnly) {
      const optionalMissing = mc.filter((c) =>
        OPTIONAL_CAPABILITIES.includes(c),
      );
      setCanContinue(true);
      if (optionalMissing.length === 0) {
        props.onAllConfigured?.();
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
      props.onAllConfigured?.();
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

  const hasOptionalMissing = () =>
    getMissingCapabilities().some((c) => OPTIONAL_CAPABILITIES.includes(c));

  const onMissingCapabilityClick = (capability: string) => {
    t0 = setTimeout(() => {
      setIsShowManualInstructions(true);
    }, 1000);
    androidInterface.onMissingCapabilityClick(capability);
  };

  onCleanup(() => {
    window.clearTimeout(t0);
  });

  return (
    <div class={styles.container + " pageTransitionIn"}>
      <div class={styles.innerContainer}>
        <div class="txtSlightlyBigger">
          {props.optionalOnly ? (
            <>
              You're all set. These extras are optional — they just help the sun
              appear more reliably. Add them now or skip; you can always do it
              later.
            </>
          ) : (
            <>
              <em>minded</em> displays an overlay when you open one of the
              configured apps. For this to work you need to give us permission.
            </>
          )}
        </div>
        {/*<div*/}
        {/*  class="txtSlightlyBigger"*/}
        {/*  style="margin-top: 16px; margin-bottom: 32px;"*/}
        {/*>*/}
        {/*  <strong>*/}
        {/*    <em>minded</em> does not collect or send any kind of information!*/}
        {/*  </strong>*/}
        {/*</div>*/}
        {!props.optionalOnly &&
          getMissingCapabilities().includes("Accessibility") && (
            <div class="card">
              <p class={styles.permissionText}>
                <em>minded</em> uses accessibility capabilities only to detect
                the app that is currently in the foreground, so <em>minded</em>{" "}
                can display its interaction overlay for the apps you configured.
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
            </div>
          )}
        {!props.optionalOnly &&
          getMissingCapabilities().includes("SystemAlertWindow") && (
            <div class="card">
              <p class={styles.permissionText}>
                To display its overlays, <em>minded </em>needs the overlay
                permission.
              </p>
              <Btn
                onClick={() => onMissingCapabilityClick("SystemAlertWindow")}
              >
                Enable Overlay Permission
              </Btn>
            </div>
          )}
        {/* Optional capabilities are deferred during the required onboarding
            step (requiredOnly) so a first-run user meets two cards, not four.
            They get their own dedicated step afterwards (optionalOnly), and
            also surface via the dashboard's missing-permissions banner. */}
        {!props.requiredOnly && hasOptionalMissing() && (
          <div class={styles.optionalSection}>
            {!props.optionalOnly && (
              <p class={styles.optionalHeading}>
                Recommended. <em>minded</em> already works with the permissions
                above; the steps below are optional and make detection more
                reliable.
              </p>
            )}
            {getMissingCapabilities().includes("UsageStats") && (
              <div class="card">
                <span class={styles.optionalBadge}>Optional</span>
                <p class={styles.permissionText}>
                  <em>minded</em> uses usage access as a backup way to detect
                  the app in the foreground. Without it, detection is less
                  reliable for apps with long loading screens.
                </p>
                <Btn onClick={() => onMissingCapabilityClick("UsageStats")}>
                  Enable Usage Access
                </Btn>
              </div>
            )}
            {getMissingCapabilities().includes("BatteryOptimization") && (
              <div class="card">
                <span class={styles.optionalBadge}>Optional</span>
                <p class={styles.permissionText}>
                  Battery optimization can silently stop <em>minded</em> in the
                  background, so interventions no longer appear. Excluding{" "}
                  <em>minded</em> from battery optimization keeps the protection
                  running.
                </p>
                <Btn
                  onClick={() =>
                    onMissingCapabilityClick("BatteryOptimization")
                  }
                >
                  Disable Battery Optimization
                </Btn>
              </div>
            )}
          </div>
        )}

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
