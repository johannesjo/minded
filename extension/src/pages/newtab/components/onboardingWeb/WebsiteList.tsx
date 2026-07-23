import { createSignal, For, JSX, onCleanup, onMount, Show } from "solid-js";
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
import Btn from "@src/shared/components/ui/Btn";

type SaveState = {
  type: "idle" | "saving" | "saved" | "error";
  message?: string;
};

type RemovedItem = {
  value: string;
  index: number;
};

type ValidationResult = {
  errors: Record<number, string>;
  normalizedByIndex: Record<number, string>;
  normalizedItems: string[];
};

const normalizeHostInput = (
  rawValue: string,
): { value: string; error?: string } => {
  const trimmed = rawValue.trim().toLowerCase();
  if (!trimmed) return { value: "" };

  let host = "";
  try {
    const url = new URL(
      trimmed.includes("://") ? trimmed : `https://${trimmed}`,
    );
    host = url.host;
  } catch {
    return { value: trimmed, error: "Enter a valid website, like reddit.com" };
  }

  host = host.replace(/^www\./, "").replace(/\.$/, "");

  if (!host) {
    return { value: trimmed, error: "Enter a valid website" };
  }
  if (/\s/.test(host) || !/^[a-z0-9.-]+(?::\d{1,5})?$/.test(host)) {
    return { value: host, error: "Use only the website host, not search text" };
  }

  const [hostname, port] = host.split(":");
  if (port && (Number(port) < 1 || Number(port) > 65535)) {
    return { value: host, error: "Port number is out of range" };
  }
  if (hostname !== "localhost" && !hostname.includes(".")) {
    return { value: host, error: "Include the domain ending, like .com" };
  }
  if (
    hostname !== "localhost" &&
    hostname
      .split(".")
      .some((part) => !part || part.startsWith("-") || part.endsWith("-"))
  ) {
    return { value: host, error: "Enter a valid domain name" };
  }

  return { value: host };
};

export const WebsiteList: (props: {
  onAfterSave?: () => void;
  showSaveButton?: boolean;
  initialItems?: string[];
}) => JSX.Element = (props) => {
  const [items, setItems] = createSignal<string[]>(props.initialItems ?? []);
  const [errors, setErrors] = createSignal<Record<number, string>>({});
  const [saveState, setSaveState] = createSignal<SaveState>({ type: "idle" });
  const [removedItem, setRemovedItem] = createSignal<RemovedItem | null>(null);
  let saveRequestId = 0;
  let savedStatusTimeout: NodeJS.Timeout | undefined;

  onMount(() => {
    if (props.initialItems !== undefined) return;

    getSyncData().then((syncData) => {
      if (syncData.cfg.blockedHosts?.length) {
        setItems(syncData.cfg.blockedHosts);
      } else {
        setItems(DEFAULT_SYNC_DATA.cfg.blockedHosts);
      }
    });
  });

  onCleanup(() => {
    window.clearTimeout(savedStatusTimeout);
  });

  const validateItems = (newItems: string[]): ValidationResult => {
    const nextErrors: Record<number, string> = {};
    const normalizedByIndex: Record<number, string> = {};
    const normalizedItems: string[] = [];
    const seen = new Set<string>();

    newItems.forEach((item, index) => {
      const normalized = normalizeHostInput(item);

      if (!normalized.value) {
        return;
      }

      normalizedByIndex[index] = normalized.value;

      if (normalized.error) {
        nextErrors[index] = normalized.error;
        return;
      }

      if (seen.has(normalized.value)) {
        nextErrors[index] = "Already in the list";
        return;
      }

      seen.add(normalized.value);
      normalizedItems.push(normalized.value);
    });

    return { errors: nextErrors, normalizedByIndex, normalizedItems };
  };

  const getDisplayItems = (
    newItems: string[],
    validation: ValidationResult,
  ): string[] =>
    newItems.map((item, index) =>
      validation.errors[index]
        ? item
        : (validation.normalizedByIndex[index] ?? item.trim()),
    );

  const setSavedState = () => {
    setSaveState({ type: "saved", message: "Saved" });
    window.clearTimeout(savedStatusTimeout);
    savedStatusTimeout = window.setTimeout(() => {
      setSaveState({ type: "idle" });
    }, 2200);
  };

  const saveItems = async (
    newItems: string[],
    options: { requireOne?: boolean } = {},
  ): Promise<boolean> => {
    const currentSaveRequestId = ++saveRequestId;
    const validation = validateItems(newItems);
    setErrors(validation.errors);

    if (Object.keys(validation.errors).length) {
      setSaveState({
        type: "error",
        message: "Fix invalid website entries to save.",
      });
      return false;
    }

    if (options.requireOne && !validation.normalizedItems.length) {
      setSaveState({
        type: "error",
        message: "Add at least one website to continue.",
      });
      return false;
    }

    setSaveState({ type: "saving", message: "Saving..." });

    try {
      await updateUserCfg({ blockedHosts: validation.normalizedItems });
      if (currentSaveRequestId !== saveRequestId) return true;
      setSavedState();
      if (props.showSaveButton === false) {
        props.onAfterSave?.();
      }
      return true;
    } catch {
      if (currentSaveRequestId === saveRequestId) {
        setSaveState({
          type: "error",
          message: "Could not save. Please try again.",
        });
      }
      return false;
    }
  };

  const updateItemsAndErrors = (newItems: string[]) => {
    const validation = validateItems(newItems);
    setItems(getDisplayItems(newItems, validation));
    setErrors(validation.errors);
    return validation;
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
    updateItemsAndErrors(newItems);
    if (props.showSaveButton === false) {
      saveItems(newItems);
    }
  };
  const removeItem = (index: number) => {
    const removed = items()[index];
    const newItems = items().filter((_, i) => i !== index);
    setRemovedItem({ value: removed, index });
    updateItemsAndErrors(newItems);
    if (props.showSaveButton === false) {
      saveItems(newItems);
    }
  };
  const saveAndContinue = async () => {
    const currentItems = items();
    updateItemsAndErrors(currentItems);
    const saved = await saveItems(currentItems, {
      requireOne: true,
    });
    if (saved) {
      props.onAfterSave?.();
    }
  };

  const undoRemove = () => {
    const removed = removedItem();
    if (!removed) return;

    const newItems = [...items()];
    newItems.splice(removed.index, 0, removed.value);
    setRemovedItem(null);
    updateItemsAndErrors(newItems);
    if (props.showSaveButton === false) {
      saveItems(newItems);
    }
  };

  const statusMessage = () => {
    if (saveState().type === "error") return saveState().message;
    if (removedItem()) return "Website removed.";
    return saveState().message;
  };

  return (
    <div
      classList={{
        [styles.WebsiteList]: true,
        [styles.settingsLayout]: props.showSaveButton === false,
      }}
    >
      <div class={styles.WebsiteListItems}>
        <For each={items()}>
          {(item, index) => (
            <WebsiteListItem
              value={item}
              index={index()}
              error={errors()[index()]}
              update={(value) => updateItem(index(), value)}
              remove={() => removeItem(index())}
            />
          )}
        </For>
      </div>

      <Show when={statusMessage()}>
        <div
          classList={{
            [styles.status]: true,
            [styles.isError]: saveState().type === "error" && !removedItem(),
            [styles.isSaved]: saveState().type === "saved" && !removedItem(),
          }}
          aria-live="polite"
        >
          <span>{statusMessage()}</span>
          <Show when={removedItem()}>
            <button
              type="button"
              class={styles.undoButton}
              onClick={undoRemove}
            >
              Undo
            </button>
          </Show>
        </div>
      </Show>

      <div class={styles.controls}>
        <Btn onClick={addItem}>
          <Ico name="add" /> Add item
        </Btn>

        {props.showSaveButton !== false && (
          <Btn
            disabled={saveState().type === "saving"}
            onClick={saveAndContinue}
          >
            <Ico name="send" /> Save & Continue
          </Btn>
        )}
      </div>
    </div>
  );
};
