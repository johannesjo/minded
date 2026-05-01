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
  requestFocusAndShowKeyboard: () => void;
  getAllApps: () => string;
  getMissingCapabilities: () => string;
  onMissingCapabilityClick: (capability: string) => void;
  triggerHaptic: (type: "light" | "medium" | "heavy") => void;
  setSessionLimit: (seconds: number) => void;
  scheduleSleepWindDownAlarms: () => void;
  scheduleNextFutureSleepWindDownAlarm: () => void;
  dismissSleepWindDownNotification: () => void;
  hasNotificationPermission: () => boolean;
  requestNotificationPermission: () => void;
  getSafeAreaInsets: () => string;
  test: () => void;
}

declare const androidMinded: InteractionWindowJavaScriptInterface;

export const androidInterface = IS_ANDROID ? androidMinded : ({} as never);

export const ANDROID_EV_RESUME = "androidAppResume";
