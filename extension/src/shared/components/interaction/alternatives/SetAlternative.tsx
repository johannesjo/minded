/* @refresh reload */
import { JSX } from "solid-js";
import {
  IS_APP,
  IS_WEB_EXT,
  saveStructuredAlternativeApp,
  saveStructuredAlternativeWebsite,
} from "@src/dataInterface/commonSyncDataInterface";
import { InputWithSend } from "@src/shared/components/ui/InputWithSend";

// once on app load

export const SetAlternativeInteraction: (props: {
  onSuccess: () => void;
  onSkip: () => void;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  const onSave = async (val: string) => {
    const alternative = val.trim();
    if (!alternative || alternative === "https://") {
      return;
    }

    if (IS_APP) {
      await saveStructuredAlternativeApp(alternative);
    } else {
      await saveStructuredAlternativeWebsite(alternative);
    }
    props.onSuccess();
  };

  return (
    <div onmouseenter={props.onCancelCountdown}>
      <div class="txtBig">
        {IS_APP
          ? "What other app would be better to use instead of this one?"
          : "What website might be better to visit instead of this one?"}
      </div>

      <InputWithSend
        isAutoFocus={true}
        type={IS_WEB_EXT ? "url" : "text"}
        onCancelCountdown={props.onCancelCountdown}
        maxLength={500}
        onSubmit={onSave}
      />
    </div>
  );
};
