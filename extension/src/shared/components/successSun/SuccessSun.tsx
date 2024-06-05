import { Component, onMount } from "solid-js";
import { fadeOut, promiseTimeout } from "@src/util/animation";
import { IS_TOUCH_PRIMARY } from "@src/util/touch";
// @ts-expect-error
import { IS_ANDROID } from "@dataInterface/isAndroid";

interface SuccessSunProps {
  isReducedSuccessSun?: boolean;
  onSuccessSunTap?: () => void;
  onAfterAni?: () => void;
  wrapperEl?: HTMLElement;
  msg?: string;
  reducedAniInDuration?: number;
}

// NOTE: ani in needs to match css value for smoothness
const SUCCESS_SUN_ANI_IN_DURATION = 800;
const SUCCESS_SUN_STAY_DURATION = 3600;
const SUCCESS_SUN_ANI_FADE_OUT_DURATION = 1600;
const SUCCESS_SUN_REDUCED_ANI_IN_DURATION = 320;
const SUCCESS_SUN_REDUCED_ANI_FADE_OUT_DURATION = 300;

export const SuccessSun: Component<SuccessSunProps> = (props) => {
  let successSunEl;
  let successSunSunEl;

  onMount(() => {
    showSuccessSunAniFlow();
  });

  const showSuccessSunAniFlow = async () => {
    // wait for keyboard to close on android
    if (IS_ANDROID) {
      window.focus();
      await promiseTimeout(100);
    }

    if (props.isReducedSuccessSun) {
      const aniDur =
        props.reducedAniInDuration || SUCCESS_SUN_REDUCED_ANI_IN_DURATION;
      successSunSunEl.style.animationDuration = `${aniDur}ms`;
      // await promiseTimeout(20);
      successSunSunEl.style.animationFillMode = `forwards`;

      await promiseTimeout(aniDur);
      if (props.wrapperEl) {
        await fadeOut(
          props.wrapperEl,
          SUCCESS_SUN_REDUCED_ANI_FADE_OUT_DURATION,
        ).promise;
      }
    } else {
      // wait for sun
      successSunEl.style.animationDuration = `${SUCCESS_SUN_ANI_IN_DURATION}ms`;
      await promiseTimeout(SUCCESS_SUN_ANI_IN_DURATION);
      successSunSunEl.style.animation = `${SUCCESS_SUN_STAY_DURATION}ms minded6622successSunStay ease-in-out`;
      successSunSunEl.style.animationFillMode = `forwards`;
      await promiseTimeout(SUCCESS_SUN_STAY_DURATION);
      successSunSunEl.style.animationDuration = `0s`;
      successSunSunEl.style.animationFillMode = `forwards`;
      if (props.wrapperEl) {
        await fadeOut(props.wrapperEl, SUCCESS_SUN_ANI_FADE_OUT_DURATION)
          .promise;
      }
    }

    props.onAfterAni?.();
  };

  return (
    <div
      id="minded-6622-success-sun"
      class={props.isReducedSuccessSun ? "reducedSuccessSun" : ""}
      ref={successSunEl}
      onclick={() => props.onSuccessSunTap?.()}
    >
      <div ref={successSunSunEl}></div>
      <div>
        {props.msg}

        {!props.isReducedSuccessSun && !props.msg && (
          <>
            {IS_TOUCH_PRIMARY ? "tap" : "click"} sun to close{" "}
            {IS_ANDROID ? "app" : "the website"}
          </>
        )}
      </div>
    </div>
  );
};

export default SuccessSun;
