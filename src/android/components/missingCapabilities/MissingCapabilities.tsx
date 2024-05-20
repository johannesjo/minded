export const MissingCapabilityView = ({
  missingCapabilities,
  onMissingCapabilityClick,
}) => {
  return (
    <div style={{ padding: "16px" }}>
      <div
        style={{
          display: "flex",
          "flex-direction": "column",
          "justify-content": "center",
          "align-items": "center",
          height: "100%",
        }}
      >
        <p style={{ "font-size": "18px", "text-align": "center" }}>
          Before you can use the app, you need to give the following
          permissions. Remember: minded does not collect any data. Everything
          stays on your device.
        </p>

        {missingCapabilities.includes("SystemAlertWindow") && (
          <>
            <p
              style={{
                "font-size": "18px",
                "text-align": "center",
                "margin-top": "32px",
              }}
            >
              Minded displays an overlay to interrupt your visits to apps you
              want to use less. For this to work, minded needs the overlay
              permission.
            </p>
            <button
              style={{ "margin-top": "16px" }}
              onClick={() => onMissingCapabilityClick("SystemAlertWindow")}
            >
              Enable Overlay Permission
            </button>
          </>
        )}

        {missingCapabilities.includes("Accessibility") && (
          <>
            <p
              style={{
                "font-size": "18px",
                "text-align": "center",
                "margin-top": "32px",
              }}
            >
              The minded accessibility service is required to detect app starts
              on your device, so minded knows when to display the interaction
              overlay.
            </p>
            <button
              style={{ "margin-top": "16px" }}
              onClick={() => onMissingCapabilityClick("Accessibility")}
            >
              Enable Accessibility Service
            </button>
          </>
        )}

        <p
          style={{
            "font-size": "14px",
            "text-align": "center",
            "margin-top": "16px",
          }}
        >
          If the buttons above does not work, you can enable the accessibility
          service and the permission manually in your device settings.
        </p>
        <p
          style={{
            "font-size": "14px",
            "text-align": "center",
            "margin-top": "8px",
          }}
        >
          In case there are problems with the accessibility service, enabling,
          disabling and then enabling the service again will likely help.
        </p>
      </div>
    </div>
  );
};
