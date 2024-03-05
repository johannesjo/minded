import { createSignal, JSX } from "solid-js";
import { WebsiteListItem } from "@src/shared/components/WebsiteListItem";
import { DEFAULT_SYNC_DATA } from "@src/shared/data/sync-data.const";

export const WebsiteList: () => JSX.Element = () => {
  let [items, setItems] = createSignal<string[]>(
    DEFAULT_SYNC_DATA.cfg.blockedHosts,
  );

  const addItem = () => setItems([...items(), ""]);
  const updateItem = (index: number, value: string) =>
    setItems(items().map((item, i) => (i === index ? value : item)));
  const removeItem = (index: number) =>
    setItems(items().filter((_, i) => i !== index));

  return (
    <>
      {items().map((item, index) => (
        <WebsiteListItem
          key={index}
          value={item}
          update={(value) => updateItem(index, value)}
          remove={() => removeItem(index)}
        />
      ))}
      <button onClick={addItem}>Add item</button>
    </>
  );
};
