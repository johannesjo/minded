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
import { JSXElement } from "solid-js";

const ICO_MAP = {
  settings: settingsSvg,
  askQuestion: askQuestionSvg,
  feedback: feedbackSvg,
  close: closeSvg,
  send: sendSvg,
  questionExchange: questionExchangeSvg,
  add: addSvg,
  arrowBack: arrowBackSvg,
} as const;

export const Ico = (props: {
  name: keyof typeof ICO_MAP;
  size?: number;
}): JSXElement => {
  // const size = props.size || 24;
  const size = props.size || 24;
  // Component's render function
  return (
    <img
      class="minded-6622-ico"
      src={ICO_MAP[props.name]}
      style={size ? { width: size + "px", height: size + "px" } : {}}
    />
  );
};
