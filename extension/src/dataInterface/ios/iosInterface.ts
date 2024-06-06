// eslint-disable-next-line @typescript-eslint/ban-ts-comment

// interface InteractionWindowJavaScriptInterface {
//   onSuccessSunTap: () => void;
//   showLittleSun: () => void;
//   saveDataString: (value: string) => void;
//   retrieveDataString: () => string | null;
//   setQuestion: (questionAsString: string) => void;
//   unsetQuestion: () => void;
//   setAnswerTxt: (txt: string) => void;
//   onSkip: () => void;
//   hideWindow: () => void;
//   requestFocusAndShowKeyboard: () => void;
//   getAllApps: () => string;
//   getMissingCapabilities: () => string;
//   onMissingCapabilityClick: (capability: string) => void;
// }

// declare const iosMinded: InteractionWindowJavaScriptInterface;

// export const iosInterface = IS_ANDROID ? iosMinded : ({} as never);
export const iosInterface = {} as never;

export const IOS_EV_RESUME = "iosAppResume";
