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
}

declare const androidMinded: InteractionWindowJavaScriptInterface;

export const androidInterface = androidMinded;

export const ANDROID_EV_RESUME = "androidAppResume";
