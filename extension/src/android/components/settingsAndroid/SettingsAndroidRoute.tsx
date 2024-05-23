import { SettingsAndroid } from "@src/android/components/settingsAndroid/SettingsAndroid";

export const SettingsAndroidRoute = () => {
  return (
    <SettingsAndroid isRouting={true} saveBtnTxt="➤ save" onSave={() => {}} />
  );
};
