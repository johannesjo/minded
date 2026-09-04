import { IS_ANDROID } from "@src/dataInterface/commonSyncDataInterface";
import { androidInterface } from "@src/dataInterface/android/androidInterface";

/**
 * Hand a text file to the user, or take one from them - the two halves of the
 * answer-journal backup (see journalBackup.ts).
 *
 * On the extension a Blob + `<a download>` is enough. An Android WebView can't
 * download a blob: URL, so the native side opens the system "save as" sheet
 * (ACTION_CREATE_DOCUMENT) through the bridge instead. Picking a file works
 * the same everywhere: a plain `<input type="file">`, which the Android host
 * routes to the system document picker via WebChromeClient.onShowFileChooser.
 */
export type SaveTextFileResult = "saved" | "unsupported";

export const saveTextFile = (
  filename: string,
  content: string,
  mimeType = "application/json",
): SaveTextFileResult => {
  if (IS_ANDROID) {
    if (typeof androidInterface.saveTextFile !== "function") {
      return "unsupported";
    }
    androidInterface.saveTextFile(filename, content);
    return "saved";
  }
  if (
    typeof document === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    return "unsupported";
  }
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the download a moment to start before the URL goes away.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "saved";
};

/** Resolves with the chosen file's text, or null when the picker is closed. */
export const pickTextFile = (
  accept = "application/json,.json",
): Promise<string | null> =>
  new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.display = "none";
    const finish = (text: string | null) => {
      input.remove();
      resolve(text);
    };
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }
      file.text().then(finish, () => finish(null));
    });
    input.addEventListener("cancel", () => finish(null));
    document.body.appendChild(input);
    input.click();
  });
