import { Question } from "@src/shared/data/questions";

interface InteractionWindowJavaScriptInterface {
  onSuccess: () => void;
  onSkip: () => void;
  closeTabOrApp: () => void;
  fadeOutMainFinal: () => void;
  setQuestion: (question: Question) => void;
  setLittleSunTxt: (txt: String) => void;
}

declare const android: InteractionWindowJavaScriptInterface;

export const androidInterface = android;
// android.onSuccess();
// android.onSkip();

export const closeTabOrApp = () => {
  console.log("NOT IMPLEMENTED");
  android.closeTabOrApp();
};
