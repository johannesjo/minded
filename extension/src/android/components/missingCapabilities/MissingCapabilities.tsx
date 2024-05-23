import { createSignal, onCleanup } from "solid-js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import styles from "./MissingCapabilities.module.scss";
import { androidInterface } from "@src/dataInterface/android/androidInterface";

export const MissingCapabilityView = ({ missingCapabilities }) => {
  const [getIsShowManualInstructions, setIsShowManualInstructions] =
    createSignal<boolean>(false);
  let t0;

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
        <div class="h2">
          Welcome to <em>minded</em>! 😊
        </div>

        <div class="txtBig">
          <em>minded</em> displays an overlay to interrupt your visits to apps
          you want to use less. Before you can use the app as intended, you need
          to give it permission to allow this.
        </div>

        <div class="txtBig" style="margin-top: 16px; margin-bottom: 16px;">
          <strong>
            <em>minded</em> does not collect any data! Everything stays on your
            device!
          </strong>
        </div>

        {missingCapabilities.includes("SystemAlertWindow") && (
          <div class="card">
            <p class={styles.permissionText + "  txtSlightlyBigger"}>
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

        {missingCapabilities.includes("Accessibility") && (
          <div class="card">
            <p class={styles.permissionText + "  txtSlightlyBigger"}>
              The <em>minded</em> accessibility service is required to detect
              app starts on your device, so <em>minded</em> knows when to
              display the interaction overlay.
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
