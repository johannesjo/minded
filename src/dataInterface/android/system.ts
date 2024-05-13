import { Question } from "@src/shared/data/questions";

interface InteractionWindowJavaScriptInterface {
  onSuccessSunTap: () => void;
  saveString: (key: string, value: string) => void;
  retrieveString: (key: string) => string | null;
  setQuestion: (questionAsString: string) => void;
  setLittleSunTxt: (txt: string) => void;
  onSkip: () => void;
  hideWindow: () => void;
  closeTabOrApp: () => void;
  fadeOutMainFinal: () => void;
}

declare const android: InteractionWindowJavaScriptInterface;

export const androidInterface = android;
