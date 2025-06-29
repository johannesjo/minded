import { JSXElement } from "solid-js";
import settingsSvg from "@assets/img/settings.svg";
import askQuestionSvg from "@assets/img/ask-question.svg";
import feedbackSvg from "@assets/img/feedback.svg";
import closeSvg from "@assets/img/close.svg";
import sendSvg from "@assets/img/send.svg";
import questionExchangeSvg from "@assets/img/question-exchange.svg";
import addSvg from "@assets/img/add.svg";
import arrowBackSvg from "@assets/img/arrow-back.svg";
import deleteSvg from "@assets/img/delete.svg";
import deleteForeverSvg from "@assets/img/delete-forever.svg";
import editSvg from "@assets/img/edit.svg";
import infoSvg from "@assets/img/info.svg";
import questionOverlaySvg from "@assets/img/question-overlay.svg";
import checkSvg from "@assets/img/check.svg";

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
  check: checkSvg,
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
