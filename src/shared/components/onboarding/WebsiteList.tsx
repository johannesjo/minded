import { createSignal, JSX, onMount } from "solid-js";
import { WebsiteListItem } from "@src/shared/components/onboarding/WebsiteListItem";
import { DEFAULT_SYNC_DATA } from "@src/dataInterface/syncData.const";
// @ts-ignore
import styles from "./WebsiteList.module.scss";
// @ts-ignore
import { getSyncData, updateUserCfg } from "@dataInterface/syncDataInterface";

export const WebsiteList: (props: {
  onAfterSave: () => void;
}) => JSX.Element = (props) => {
  let [items, setItems] = createSignal<string[]>([]);

  onMount(() => {
    getSyncData().then((syncData) => {
      if (syncData.cfg.blockedHosts?.length) {
        setItems(syncData.cfg.blockedHosts);
      } else {
        setItems(DEFAULT_SYNC_DATA.cfg.blockedHosts);
      }
    });
  });

  const addItem = () => {
    setItems([...items(), ""]);
    setTimeout(() => {
      const allInputs = document.getElementsByTagName("input");
      if (allInputs.length) {
        allInputs[allInputs.length - 1].focus();
      }
    });
  };
  const updateItem = (index: number, value: string) =>
    setItems(items().map((item, i) => (i === index ? value : item)));
  const removeItem = (index: number) =>
    setItems(items().filter((_, i) => i !== index));
  const saveAndContinue = async () => {
    const cleanedItems = items()
      .filter((item) => item.length > 2)
      .map((item) => item.trim());
    await updateUserCfg({ blockedHosts: cleanedItems });
    props.onAfterSave();
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
        <button class="btn-big" onClick={addItem}>
          + Add item
        </button>

        <button class="btn-big" onClick={saveAndContinue}>
          Save & Continue
        </button>
      </div>
    </div>
  );
};
