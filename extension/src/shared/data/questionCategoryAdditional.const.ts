import { QuestionCategoryId } from "@src/shared/data/questions";

export const QUESTION_CATEGORY_ADDITIONAL_INFO: {
  [key in QuestionCategoryId]: string;
} = {
  [QuestionCategoryId.HealthierBrowsingHabits]:
    "Noticing how you browse, gently and without judgment, can help your time online feel a little more your own.",
  [QuestionCategoryId.HealthierAppUsage]:
    "Noticing how you use your phone, gently and without judgment, can help your time on it feel a little more your own.",
  [QuestionCategoryId.WhyReduceBrowsing]:
    "Remembering why you want to change can be a quiet anchor. When the pull is strong, your own reasons are there to return to.",
  [QuestionCategoryId.WhyReduceAppUsage]:
    "Remembering why you want to change can be a quiet anchor. When the pull is strong, your own reasons are there to return to.",
  [QuestionCategoryId.PersonalResources]:
    "Noticing your own strengths can be a quiet source of confidence to draw on when things feel hard.",
  [QuestionCategoryId.TodayILearned]:
    "Pausing on what you noticed today lets the day's small discoveries settle - nothing to prove, just worth keeping.",
  [QuestionCategoryId.RefocusHelperToday]:
    "Naming one thing that matters today can bring a little clarity, and a gentler sense of where to begin.",
  [QuestionCategoryId.Motivation]:
    "Noticing what quietly moves you can help you begin again when things feel heavy - no pressure, just a reminder of what's yours.",
  [QuestionCategoryId.Gratitude]:
    "Noticing what you're grateful for, even something small, can gently soften a heavy moment.",
  [QuestionCategoryId.HelpfulTools]:
    "Noticing what helps you settle can make it a little easier to come back to yourself when your attention scatters.",
  [QuestionCategoryId.CalmingThoughts]:
    "Letting your mind rest on something calming can ease tension and make a little more room to breathe.",
  [QuestionCategoryId.PositiveThoughts]:
    "Making room for kinder, truer thoughts can gently steady you when things feel heavy.",
  [QuestionCategoryId.GoodToday]:
    "Noticing the good in your day, however small, can quietly lift the moment - nothing needs to be earned.",
  [QuestionCategoryId.GoodPlans]:
    "Holding a gentle plan can ease worry about what's ahead and remind you there's no rush.",
  [QuestionCategoryId.GoodPlansToday]:
    "A soft sense of the day ahead can settle the mind - not a checklist, just a direction to lean toward.",
  [QuestionCategoryId.GoalForTheWeek]:
    "Noticing what matters to you this week can bring a quiet sense of direction, held lightly.",
  [QuestionCategoryId.UnderstandingProcrastination]:
    "Meeting your own patterns with curiosity, rather than blame, can gently loosen their hold.",
  [QuestionCategoryId.SelfDiscovery]:
    "Getting to know your own needs and wishes, gently and without agenda, can help you feel a little more at home with yourself.",
  [QuestionCategoryId.Insomnia]:
    "Meeting sleeplessness with patience rather than frustration can ease some of the struggle. Rest often comes more easily once we stop chasing it.",
  [QuestionCategoryId.SleepWindDown]:
    "Writing down loose thoughts before sleep can reduce the need to keep them in working memory and make it easier to leave the day alone for the night.",
  [QuestionCategoryId.SelfImprovement]:
    "Reflecting on who you'd like to become, held gently, can help you stay close to what matters to you - no pressure to be anywhere other than where you are.",
  [QuestionCategoryId.Relationships]:
    "Bringing the people who matter to mind can quietly nurture connection and remind you of the support already around you.",
  [QuestionCategoryId.MindfulEating]:
    "Paying attention to how and what you eat can help you notice hunger and fullness cues, enjoy your food more, and build a healthier relationship with eating.",
  [QuestionCategoryId.NoticingNow]:
    "Gently noticing what's around you and how your body feels can bring you back to the present moment, without anything needing to change.",
  [QuestionCategoryId.SelfCompassion]:
    "Meeting yourself with kindness, especially when things are hard, can ease self-criticism and help you respond to difficult moments with more warmth.",
  [QuestionCategoryId.LettingGo]:
    "Noticing what you can set down, and what lies outside your control, can loosen the grip of worry and make room for a little more ease.",
  [QuestionCategoryId.XEnergyLevelToday]:
    "Noticing your energy as it is right now, without needing to change it, can help you meet yourself with a little more kindness today.",
  [QuestionCategoryId.XBrowsingBehaviorHappiness]:
    "Noticing how your time online feels, gently and without judgment, can help it feel a little more your own.",
  // NO save questions
  [QuestionCategoryId.XAppUsageHappiness]:
    "Noticing how your time on your phone feels, gently and without judgment, can help it feel a little more your own.",
  [QuestionCategoryId.XEmotionLabeling]:
    "Gently naming what you feel, and noticing where it sits in your body, can bring a little clarity and help you meet difficult moments with more warmth.",
};
