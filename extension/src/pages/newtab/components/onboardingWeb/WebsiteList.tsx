import { createSignal, JSX, onMount } from "solid-js";
import { WebsiteListItem } from "@pages/newtab/components/onboardingWeb/WebsiteListItem";
import { DEFAULT_SYNC_DATA } from "@src/dataInterface/syncData.const";
// @ts-ignore
import styles from "./WebsiteList.module.scss";
// @ts-ignore
import {
  getSyncData,
  updateUserCfg,
} from "@src/dataInterface/commonSyncDataInterface";
import { Ico } from "@src/shared/components/ui/Ico";

export const WebsiteList: (props: {
  onAfterSave?: () => void;
  showSaveButton?: boolean;
}) => JSX.Element = (props) => {
  const [items, setItems] = createSignal<string[]>([]);

  onMount(() => {
    getSyncData().then((syncData) => {
      if (syncData.cfg.blockedHosts?.length) {
        setItems(syncData.cfg.blockedHosts);
      } else {
        setItems(DEFAULT_SYNC_DATA.cfg.blockedHosts);
      }
    });
  });

  const autoSave = async (newItems: string[]) => {
    if (props.showSaveButton === false) {
      const cleanedItems = newItems
        .filter((item) => item.length > 2)
        .map((item) => item.trim());
      await updateUserCfg({ blockedHosts: cleanedItems });
      props.onAfterSave?.();
    }
  };

  const addItem = () => {
    setItems([...items(), ""]);
    setTimeout(() => {
      const allInputs = document.getElementsByTagName("input");
      if (allInputs.length) {
        allInputs[allInputs.length - 1].focus();
      }
    });
  };
  const updateItem = (index: number, value: string) => {
    const newItems = items().map((item, i) => (i === index ? value : item));
    setItems(newItems);
    autoSave(newItems);
  };
  const removeItem = (index: number) => {
    const newItems = items().filter((_, i) => i !== index);
    setItems(newItems);
    autoSave(newItems);
  };
  const saveAndContinue = async () => {
    const cleanedItems = items()
      .filter((item) => item.length > 2)
      .map((item) => item.trim());
    await updateUserCfg({ blockedHosts: cleanedItems });
    props.onAfterSave?.();
  };

  return (
    <div class={styles.WebsiteList}>
      <div class={styles.WebsiteListItems}>
        {items().map((item, index) => (
          <WebsiteListItem
            // key={index}
            value={item}
            update={(value) => updateItem(index, value)}
            remove={() => removeItem(index)}
          />
        ))}
      </div>

      <div class={styles.controls}>
        <button class="btnTxt" onClick={addItem}>
          <Ico name="add" /> Add item
        </button>

        {props.showSaveButton !== false && (
          <button class="btnTxt" onClick={saveAndContinue}>
            <Ico name="send" /> Save & Continue
          </button>
        )}
      </div>
    </div>
  );
};
