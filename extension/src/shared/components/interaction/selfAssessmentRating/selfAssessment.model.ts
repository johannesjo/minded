import { TglBtnOption } from "@src/shared/components/ui/TglBtns";
import { IcoName } from "@src/shared/components/ui/Ico";

export enum SelfAssessmentId {
  CARE_OF_NEEDS = "CARE_OF_NEEDS",
  SOCIAL_CONTACTS = "SOCIAL_CONTACTS",
  HAPPY_WITH_ACHIEVEMENTS = "HAPPY_WITH_ACHIEVEMENTS",
  WAS_OPTIMISTIC = "WAS_OPTIMISTIC",
  TRIED_NEW_THINGS = "TRIED_NEW_THINGS",
  COULD_RELAX = "COULD_RELAX",
  TRIED_TO_SEE_THE_GOOD = "TRIED_TO_SEE_THE_GOOD",
  WAS_HAPPY = "WAS_HAPPY",
  WAS_COURAGEOUS = "WAS_COURAGEOUS",
  ABLE_TO_DROP_NEGATIVE_THOUGHTS = "ABLE_TO_DROP_NEGATIVE_THOUGHTS",
  HAD_ENOUGH_ENERGY = "HAD_ENOUGH_ENERGY",
  SLEPT_WELL = "SLEPT_WELL",
  ENJOYED_LIFE = "ENJOYED_LIFE",
}

interface SelfAssessmentQuestion {
  id: SelfAssessmentId;
  question: string;
  short: string;
  ico: IcoName;
}

export const SELF_ASSESSMENT_QUESTIONS: SelfAssessmentQuestion[] = [
  {
    id: SelfAssessmentId.CARE_OF_NEEDS,
    question: "I took care of my needs",
    ico: "info",
    short: "Care of Needs",
  },
  {
    id: SelfAssessmentId.SOCIAL_CONTACTS,
    question: "I had enough social contacts",
    ico: "askQuestion",
    short: "Social Contacts",
  },
  {
    id: SelfAssessmentId.HAPPY_WITH_ACHIEVEMENTS,
    question: "I am happy with what I achieved",
    ico: "info",
    short: "Achievements",
  },
  {
    id: SelfAssessmentId.WAS_OPTIMISTIC,
    question: "I was optimistic",
    ico: "questionExchange",
    short: "Optimistic",
  },
  {
    id: SelfAssessmentId.TRIED_NEW_THINGS,
    question: "I tried new things",
    ico: "feedback",
    short: "Tried New Things",
  },
  {
    id: SelfAssessmentId.COULD_RELAX,
    question: "I could relax",
    ico: "edit",
    short: "Could Relax",
  },
  {
    id: SelfAssessmentId.TRIED_TO_SEE_THE_GOOD,
    question: "I tried to see the good",
    ico: "questionExchange",
    short: "Appreciation",
  },
  {
    id: SelfAssessmentId.WAS_HAPPY,
    question: "I was happy",
    ico: "info",
    short: "Happy",
  },
  {
    id: SelfAssessmentId.WAS_COURAGEOUS,
    question: "I was courageous",
    ico: "info",
    short: "Courageous",
  },
  {
    id: SelfAssessmentId.ABLE_TO_DROP_NEGATIVE_THOUGHTS,
    question: "I was able to drop negative thoughts",
    ico: "info",
    short: "Dropping Negative Thoughts",
  },
  {
    id: SelfAssessmentId.HAD_ENOUGH_ENERGY,
    question: "I had enough energy",
    ico: "info",
    short: "Enough Energy",
  },
  {
    id: SelfAssessmentId.SLEPT_WELL,
    question: "I slept well",
    ico: "info",
    short: "Slept Well",
  },
  {
    id: SelfAssessmentId.ENJOYED_LIFE,
    question: "I enjoyed life",
    ico: "info",
    short: "Enjoyed Life",
  },
];

export type SelfReflectionAnswerVal = 1 | 2 | 3 | 4;

export interface SelfReflectionAnswer
  extends TglBtnOption<SelfReflectionAnswerVal> {}

export const SELF_ASSESSMENT_ANSWERS: SelfReflectionAnswer[] = [
  { txt: "(almost) never", val: 1 },
  { txt: "sometimes", val: 2 },
  { txt: "often", val: 3 },
  { txt: "(almost) always", val: 4 },
];
