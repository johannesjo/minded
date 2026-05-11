/**
 * Shared type declarations for the dataInterface abstraction pattern.
 * All platform implementations (extension, android, ios) must conform to these interfaces.
 */

import type { Answer, SyncData } from "@src/dataInterface/syncData";

/**
 * Platform detection flags
 */
export interface PlatformFlags {
  IS_ANDROID: boolean;
  IS_IOS: boolean;
  IS_APP: boolean;
  IS_WEB_EXT: boolean;
}

/**
 * Sync data interface contract - all platforms must implement these
 */
export interface SyncDataInterface {
  getSyncDataN: () => Promise<SyncData>;
  saveSyncDataN: (syncData: SyncData) => Promise<void>;
  saveAnswerN: (answer: Answer) => Promise<void>;
}

/**
 * System interface contract - platform-specific system functions
 */
export interface SystemInterface extends PlatformFlags {
  requestFocusAndShowKeyboard: () => void;
}

/**
 * Android native bridge interface
 * Maps to the JavaScript interface exposed by Android WebView
 */
export interface AndroidMindedBridge {
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
  setSessionLimit: (payloadJson: string) => void;
  test: () => void;
}

/**
 * iOS native bridge interface (placeholder for future implementation)
 */
export interface IOSMindedBridge {
  // Add iOS-specific methods when they exist
}
