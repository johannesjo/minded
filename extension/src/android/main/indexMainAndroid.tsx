window.IS_MAIN_MINDED_6622 = true;

import "./indexMainAndroid.scss";
// @ts-ignore
import MainAndroid from "@src/android/main/MainAndroid";
import { setupKeyboardScrolling } from "@src/dataInterface/android/setupKeyboardScrolling";
import { setupAndroidInsets } from "@src/dataInterface/android/setupAndroidInsets";
import { setupAndroidBackSwipe } from "@src/dataInterface/android/setupAndroidBackSwipe";
import { mountApp } from "@src/shared/mountApp";

setupKeyboardScrolling();
setupAndroidBackSwipe();

mountApp(() => <MainAndroid />, setupAndroidInsets);
