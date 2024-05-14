interface InteractionWindowJavaScriptInterface {
  onSuccessSunTap: () => void;
  showAfterSun: () => void;
  saveString: (key: string, value: string) => void;
  retrieveString: (key: string) => string | null;
  setQuestion: (questionAsString: string) => void;
  setAnswerTxt: (txt: string) => void;
  onSkip: () => void;
  hideWindow: () => void;
  closeTabOrApp: () => void;
  fadeOutMainFinal: () => void;
  requestFocusAndShowKeyboard: () => void;
}

declare const android: InteractionWindowJavaScriptInterface;

export const androidInterface = android;

export const requestFocusAndShowKeyboard = () => {
  androidInterface.requestFocusAndShowKeyboard();
};
