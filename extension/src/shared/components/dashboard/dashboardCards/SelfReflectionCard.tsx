import { For, JSX } from "solid-js";
import { SELF_REFLECTION_QUESTIONS } from "@src/shared/components/interaction/selfReflectionRating/selfReflection.model";
// @ts-ignore
import styles from "./SelfReflectionCard.module.scss";

export const SelfReflectionCard = (): JSX.Element => {
  return (
    <div>
      <div class="dashboardHeading">recently...</div>
      <div class="dashboardContent" style="display: inline-block">
        <table>
          <For each={SELF_REFLECTION_QUESTIONS.slice(0, 3)}>
            {(q) => (
              <tr class={styles.selfReflectionQuestion}>
                {/*<td style="text-align: left; padding-top: 8px">{q.short}</td>*/}
                <td style="text-align: center; padding-top: 8px; vertical-align: middle;">
                  <div style=" align-items: center">
                    {/*<div style="opacity: .8; margin-right: 8px;">*/}
                    {/*  <Ico name={q.ico} size={18} />*/}
                    {/*</div>*/}
                    <div>{q.short}</div>
                  </div>
                </td>
                <td style="padding-top: 8px">
                  {/*<em>always</em>*/}
                  <div style="display: flex; margin-left: 16px">
                    <div style="width: 10px; height: 10px; background: rgba(0,0,0,.55); border-radius: 50%; "></div>
                    <div style="width: 10px; height: 10px; background: rgba(0,0,0,.55); border-radius: 50%; margin-left: 4px "></div>
                    <div style="width: 10px; height: 10px; background: rgba(0,0,0,.55); border-radius: 50%; margin-left: 4px "></div>
                    <div style="width: 10px; height: 10px; background: rgba(0,0,0,.55); border-radius: 50%; margin-left: 4px "></div>
                  </div>
                </td>
              </tr>
            )}
          </For>
        </table>
      </div>
    </div>
  );
};
