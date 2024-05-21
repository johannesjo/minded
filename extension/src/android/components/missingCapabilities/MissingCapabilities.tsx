import { createSignal } from "solid-js";
// @ts-ignore
import styles from "./MissingCapabilities.module.scss";
import { androidInterface } from "@src/dataInterface/android/androidInterface";

export const MissingCapabilityView = ({ missingCapabilities }) => {
  const [getIsShowManualInstructions, setIsShowManualInstructions] =
    createSignal<boolean>(false);

  const onMissingCapabilityClick = (capability: string) => {
    console.log(capability);
    setTimeout(() => {
      setIsShowManualInstructions(true);
    });
    androidInterface.onMissingCapabilityClick(capability);
  };

  return (
    <div class={styles.container}>
      <div class={styles.innerContainer}>
        <p>
          Before you can use the app, you need to give minded permission on your
          device.
        </p>

        <p>
          Remember: <strong>minded does not collect any data</strong>.
          Everything stays on your device.
        </p>

        {missingCapabilities.includes("SystemAlertWindow") && (
          <>
            <p class={styles.permissionText}>
              Minded displays an overlay to interrupt your visits to apps you
              want to use less. For this to work, minded needs the overlay
              permission.
            </p>
            <button
              class="btn-txt"
              onClick={() => onMissingCapabilityClick("SystemAlertWindow")}
            >
              Enable Overlay Permission
            </button>
          </>
        )}

        {missingCapabilities.includes("Accessibility") && (
          <>
            <p class={styles.permissionText}>
              The minded accessibility service is required to detect app starts
              on your device, so minded knows when to display the interaction
              overlay.
            </p>
            <button
              class="btn-txt"
              onClick={() => onMissingCapabilityClick("Accessibility")}
            >
              Enable Accessibility Service
            </button>
          </>
        )}

        {getIsShowManualInstructions() && (
          <>
            <p class={styles.smallText}>
              If the buttons above does not work, you can enable the
              accessibility service and the permission manually in your device
              settings.
            </p>
            <p class={styles.smallText}>
              In case there are problems with the accessibility service,
              enabling, disabling and then enabling the service again will
              likely help.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
