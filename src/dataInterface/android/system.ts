import { Question } from "@src/shared/data/questions";

interface InteractionWindowJavaScriptInterface {
  onSuccess: () => void;
  saveString: (key: string, value: string) => void;
  retrieveString: (key: string) => string | null;
  setQuestion: (question: Question) => void;
  setLittleSunTxt: (txt: string) => void;
  onSkip: () => void;
  closeTabOrApp: () => void;
  fadeOutMainFinal: () => void;
}

declare const android: InteractionWindowJavaScriptInterface;

export const androidInterface = android;
// android.onSuccess();
// android.onSkip();

export const closeTabOrApp = () => {
  console.log("NOT IMPLEMENTED");
  android.closeTabOrApp();
};
