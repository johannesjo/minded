interface InteractionWindowJavaScriptInterface {
  onSuccessSunTap: () => void;
  showLittleSun: () => void;
  saveString: (key: string, value: string) => void;
  retrieveString: (key: string) => string | null;
  setQuestion: (questionAsString: string) => void;
  setAnswerTxt: (txt: string) => void;
  onSkip: () => void;
  hideWindow: () => void;
  requestFocusAndShowKeyboard: () => void;
}

declare const androidMinded: InteractionWindowJavaScriptInterface;

export const androidInterface = androidMinded;

export const requestFocusAndShowKeyboard = () => {
  androidInterface.requestFocusAndShowKeyboard();
};

export const ANDROID_EV_RESUME = "androidAppResume";
