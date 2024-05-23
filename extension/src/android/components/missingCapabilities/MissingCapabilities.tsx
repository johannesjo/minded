import { createSignal, onCleanup, onMount } from "solid-js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import styles from "./MissingCapabilities.module.scss";
import {
  ANDROID_EV_RESUME,
  androidInterface,
} from "@src/dataInterface/android/androidInterface";

export const MissingCapabilityView = (props: {
  onAllConfigured?: () => void;
}) => {
  const [getIsShowManualInstructions, setIsShowManualInstructions] =
    createSignal<boolean>(false);

  const [getMissingCapabilities, setMissingCapabilities] = createSignal<
    string[]
  >([]);
  let t0;

  const refreshMissingCapabilities = () => {
    const mc = JSON.parse(androidInterface.getMissingCapabilities());
    setMissingCapabilities(mc);
    console.log(mc);

    if (mc.length === 0) {
      props.onAllConfigured?.();
    }
  };

  onMount(() => {
    refreshMissingCapabilities();

    window.addEventListener(ANDROID_EV_RESUME, () => {
      refreshMissingCapabilities();
    });
  });

  const onMissingCapabilityClick = (capability: string) => {
    console.log(capability);
    t0 = setTimeout(() => {
      setIsShowManualInstructions(true);
    }, 1000);
    androidInterface.onMissingCapabilityClick(capability);
  };

  onCleanup(() => {
    window.clearTimeout(t0);
  });

  return (
    <div class={styles.container}>
      <div class={styles.innerContainer}>
        <div class="txtSlightlyBigger">
          <em>minded</em> displays an overlay when you open one of the
          configured apps. For this to work you need to give permission to{" "}
          <em>minded</em>.
        </div>

        <div
          class="txtSlightlyBigger"
          style="margin-top: 16px; margin-bottom: 32px;"
        >
          <strong>
            <em>minded</em> does not collect any data! Everything stays on your
            device!
          </strong>
        </div>

        {getMissingCapabilities().includes("SystemAlertWindow") && (
          <div class="card">
            <p class={styles.permissionText + "  noRealClassMM"}>
              To display overlays, <em>minded </em>needs the overlay permission.
            </p>
            <button
              class="btnTxt"
              onClick={() => onMissingCapabilityClick("SystemAlertWindow")}
            >
              Enable Overlay Permission
            </button>
          </div>
        )}

        {getMissingCapabilities().includes("Accessibility") && (
          <div class="card">
            <p class={styles.permissionText + "  noRealClassMM"}>
              The <em>minded</em> accessibility service is required to detect
              app starts on your device, so <em>minded</em> knows when to
              display the interaction overlay. Enabling the shortcut is{" "}
              <strong>not</strong> required.
            </p>
            <button
              class="btnTxt"
              onClick={() => onMissingCapabilityClick("Accessibility")}
            >
              Enable Accessibility Service
            </button>

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
      </div>
    </div>
  );
};
