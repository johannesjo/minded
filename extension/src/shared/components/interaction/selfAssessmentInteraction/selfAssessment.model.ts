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

export interface SelfAssessmentQuestion {
  id: SelfAssessmentId;
  question: string;
  short: string;
  ico: IcoName;
}

// NOTE: framed as gentle, judgment-free noticing of the recent past, not a
// self-rating of virtues or achievements. Keep new statements observational
// ("what has my experience been like"), never a standard to measure up to.
export const SELF_ASSESSMENT_QUESTIONS: SelfAssessmentQuestion[] = [
  {
    id: SelfAssessmentId.CARE_OF_NEEDS,
    question: "I was gentle with myself",
    ico: "info",
    short: "Gentle with myself",
  },
  {
    id: SelfAssessmentId.SOCIAL_CONTACTS,
    question: "I felt connected to others",
    ico: "askQuestion",
    short: "Connection",
  },
  {
    id: SelfAssessmentId.HAPPY_WITH_ACHIEVEMENTS,
    question: "I made time for something that matters to me",
    ico: "info",
    short: "Time for what matters",
  },
  {
    id: SelfAssessmentId.WAS_OPTIMISTIC,
    question: "I looked forward to something",
    ico: "questionExchange",
    short: "Looking forward",
  },
  {
    id: SelfAssessmentId.TRIED_NEW_THINGS,
    question: "I felt curious",
    ico: "feedback",
    short: "Curious",
  },
  {
    id: SelfAssessmentId.COULD_RELAX,
    question: "I made space to rest",
    ico: "edit",
    short: "Rest",
  },
  {
    id: SelfAssessmentId.TRIED_TO_SEE_THE_GOOD,
    question: "I noticed the good around me",
    ico: "questionExchange",
    short: "Noticing the good",
  },
  {
    id: SelfAssessmentId.WAS_HAPPY,
    question: "I felt at ease",
    ico: "info",
    short: "At ease",
  },
  {
    id: SelfAssessmentId.WAS_COURAGEOUS,
    question: "I stayed with something difficult",
    ico: "info",
    short: "Staying with difficulty",
  },
  {
    id: SelfAssessmentId.ABLE_TO_DROP_NEGATIVE_THOUGHTS,
    question: "I let difficult thoughts come and go",
    ico: "info",
    short: "Letting thoughts pass",
  },
  {
    id: SelfAssessmentId.HAD_ENOUGH_ENERGY,
    question: "I had energy for what matters",
    ico: "info",
    short: "Energy",
  },
  {
    id: SelfAssessmentId.SLEPT_WELL,
    question: "I slept well",
    ico: "info",
    short: "Slept Well",
  },
  {
    id: SelfAssessmentId.ENJOYED_LIFE,
    question: "I noticed moments I enjoyed",
    ico: "info",
    short: "Moments enjoyed",
  },
];

export type SelfReflectionAnswerVal = 1 | 2 | 3 | 4;

export interface SelfReflectionAnswer
  extends TglBtnOption<SelfReflectionAnswerVal> {}

// A soft, descriptive frequency range grounded in observable days, rather than
// a "never = failing grade" ladder. Values stay 1–4 so stored history is intact.
export const SELF_ASSESSMENT_ANSWERS: SelfReflectionAnswer[] = [
  { txt: "rarely", val: 1 },
  { txt: "some days", val: 2 },
  { txt: "many days", val: 3 },
  { txt: "most days", val: 4 },
];
