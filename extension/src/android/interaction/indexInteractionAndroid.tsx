import "./indexInteractionAndroid.scss";
// @ts-ignore
import InteractionAndroid from "@src/android/interaction/InteractionAndroid";
import { setupKeyboardScrolling } from "@src/dataInterface/android/setupKeyboardScrolling";
import { setupAndroidInsets } from "@src/dataInterface/android/setupAndroidInsets";
import { mountApp } from "@src/shared/mountApp";

setupKeyboardScrolling();

mountApp(() => <InteractionAndroid />, setupAndroidInsets);
