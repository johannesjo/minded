import { SafeArea, SafeAreaInsets } from "capacitor-plugin-safe-area";

export const setupUpdateInsets = (appEl: HTMLElement) => {
  SafeArea.getSafeAreaInsets().then((data) => {
    updateInsets(data);
  });
  SafeArea.addListener("safeAreaChanged", (data) => {
    updateInsets(data);
  });

  const updateInsets = (data: SafeAreaInsets) => {
    const { insets } = data;
    console.log(data);

    for (const [key, value] of Object.entries(insets)) {
      appEl.style.setProperty(`--safe-area-inset-${key}`, `${value}px`);
    }
  };
};
