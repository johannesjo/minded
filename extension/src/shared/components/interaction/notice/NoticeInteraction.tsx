import { createSignal, JSX } from "solid-js";
import { NOTICE_CUES } from "@src/shared/components/interaction/notice/notice.const";
import { getRndEntry } from "@src/util/getRndEntry";
import Btn from "@src/shared/components/ui/Btn";

interface NoticeProps {
  onSuccess: () => void;
  onSkip: () => void;
  onCancelCountdown: () => void;
}

/**
 * A "notice → tap" micro-action: one embodied or sensory anchor in the present
 * moment ("Feel both feet on the floor"), confirmed with a single tap.
 *
 * Where ACTION_ADVICE is a passive "How about…" suggestion you read and leave,
 * this invites a small thing to *do* right now and waits for the doing — a
 * gentler, quicker alternative to typing a reflection. It asks nothing it can't
 * observe and offers nothing to score, so it stays inside minded's bar for what
 * we put in front of the user.
 */
export const NoticeInteraction = (props: NoticeProps): JSX.Element => {
  // One cue per mount: varied across interventions, stable within this one.
  const [cue] = createSignal(getRndEntry(NOTICE_CUES));

  return (
    <div
      id="minded-6622-notice"
      class="notice-interaction"
      onmousemove={props.onCancelCountdown}
    >
      <div class="notice-ico" aria-hidden="true">
        {cue().ico}
      </div>
      <div class="txtBig notice-cue">{cue().cue}</div>
      <Btn style={{ "margin-top": "24px" }} onClick={props.onSuccess}>
        {cue().done}
      </Btn>
    </div>
  );
};

export default NoticeInteraction;
