import "@src/android/interaction/indexInteractionAndroid.scss";
import SleepWindDownAndroid from "./SleepWindDownAndroid";
import { setupKeyboardScrolling } from "@src/dataInterface/android/setupKeyboardScrolling";
import { setupAndroidInsets } from "@src/dataInterface/android/setupAndroidInsets";
import { mountApp } from "@src/shared/mountApp";

setupKeyboardScrolling();

mountApp(() => <SleepWindDownAndroid />, setupAndroidInsets);
