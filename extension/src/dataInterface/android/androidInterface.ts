// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { IS_ANDROID } from "@dataInterface/isAndroid";

interface InteractionWindowJavaScriptInterface {
  onSuccessSunTap: () => void;
  showLittleSun: () => void;
  saveString: (key: string, value: string) => void;
  retrieveString: (key: string) => string | null;
  setQuestion: (questionAsString: string) => void;
  unsetQuestion: () => void;
  setAnswerTxt: (txt: string) => void;
  onSkip: () => void;
  hideWindow: () => void;
  requestFocusAndShowKeyboard: () => void;
  getAllApps: () => string;
}

declare const androidMinded: InteractionWindowJavaScriptInterface;

export const androidInterface = IS_ANDROID ? androidMinded : ({} as never);

export const ANDROID_EV_RESUME = "androidAppResume";
