import { JSXElement } from "solid-js";
// @ts-expect-error
import settingsSvg from "@assets/img/settings.svg";
// @ts-expect-error
import askQuestionSvg from "@assets/img/ask-question.svg";
// @ts-expect-error
import feedbackSvg from "@assets/img/feedback.svg";
// @ts-expect-error
import closeSvg from "@assets/img/close.svg";
// @ts-expect-error
import sendSvg from "@assets/img/send.svg";
// @ts-expect-error
import questionExchangeSvg from "@assets/img/question-exchange.svg";
// @ts-expect-error
import addSvg from "@assets/img/add.svg";
// @ts-expect-error
import arrowBackSvg from "@assets/img/arrow-back.svg";
// @ts-expect-error
import deleteSvg from "@assets/img/delete.svg";
// @ts-expect-error
import deleteForeverSvg from "@assets/img/delete-forever.svg";
// @ts-expect-error
import editSvg from "@assets/img/edit.svg";
// @ts-expect-error
import infoSvg from "@assets/img/info.svg";
// @ts-expect-error
import questionOverlaySvg from "@assets/img/question-overlay.svg";

const ICO_MAP = {
  settings: settingsSvg,
  askQuestion: askQuestionSvg,
  feedback: feedbackSvg,
  close: closeSvg,
  send: sendSvg,
  questionExchange: questionExchangeSvg,
  add: addSvg,
  arrowBack: arrowBackSvg,
  delete: deleteSvg,
  deleteForever: deleteForeverSvg,
  edit: editSvg,
  info: infoSvg,
  questionOverlay: questionOverlaySvg,
} as const;

export type IcoName = keyof typeof ICO_MAP;

const STYLE = {
  "vertical-align": "middle",
};

export const Ico = (props: { name: IcoName; size?: number }): JSXElement => {
  // const size = props.size || 24;
  const size = props.size || 24;
  // Component's render function
  return (
    <img
      class="minded-6622-ico"
      src={ICO_MAP[props.name]}
      alt={props.name}
      style={
        size ? { ...STYLE, width: size + "px", height: size + "px" } : STYLE
      }
    />
  );
};
