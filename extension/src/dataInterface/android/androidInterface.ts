import { IS_ANDROID } from "@src/dataInterface/commonSyncDataInterface";

interface InteractionWindowJavaScriptInterface {
  onSuccessSunTap: () => void;
  showLittleSun: () => void;
  saveDataString: (value: string) => void;
  retrieveDataString: () => string | null;
  setQuestion: (questionAsString: string) => void;
  unsetQuestion: () => void;
  setAnswerTxt: (txt: string) => void;
  onSkip: () => void;
  hideWindow: () => void;
  closeCurrentApp: () => void;
  lockScreen: () => void;
  requestFocusAndShowKeyboard: () => void;
  getAllApps: () => string;
  getMissingCapabilities: () => string;
  onMissingCapabilityClick: (capability: string) => void;
  triggerHaptic: (type: "light" | "medium" | "heavy") => void;
  setSessionLimit: (payloadJson: string) => void;
  snoozeWindDown: (seconds: number) => void;
  getSafeAreaInsets: () => string;
  /**
   * Real per-app foreground usage, read from the OS (UsageStatsManager).
   * Returns a JSON string of UsageObservation, or "" / null when unavailable
   * (e.g. usage-access permission not granted).
   */
  getUsageObservation: () => string | null;
  /**
   * Where the native Little Sun bubble will rest (saved drag position or its
   * default), as the bubble centre in fractions of the display: a JSON string
   * `{"fracX":0.07,"fracY":0.86}`. The departing-sun morph reads this so it
   * glides to the bubble's real position instead of the fixed corner. Returns
   * "" / null if unavailable (then the morph falls back to the corner).
   */
  getLittleSunRestCenter: () => string | null;
  test: () => void;
}

declare const androidMinded: InteractionWindowJavaScriptInterface;

export const androidInterface = IS_ANDROID ? androidMinded : ({} as never);

export const ANDROID_EV_RESUME = "androidAppResume";
