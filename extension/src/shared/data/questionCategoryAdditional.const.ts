import { QuestionCategoryId } from "@src/shared/data/questions";

export const QUESTION_CATEGORY_ADDITIONAL_INFO: {
  [key in QuestionCategoryId]: string;
} = {
  [QuestionCategoryId.HealthierBrowsingHabits]:
    "Improving your browsing habits can help you stay focused and reduce distractions. Being more intentional with your time online can support your productivity and well-being.",
  [QuestionCategoryId.HealthierAppUsage]:
    "Improving your app-usage habits can help you stay focused and reduce distractions. Being more intentional with your phone time can support your productivity and well-being.",
  [QuestionCategoryId.WhyReduceBrowsing]:
    "Remembering why you want to change is powerful. When temptation strikes, recalling your personal reasons can strengthen your resolve and keep you aligned with your values.",
  [QuestionCategoryId.WhyReduceAppUsage]:
    "Remembering why you want to change is powerful. When temptation strikes, recalling your personal reasons can strengthen your resolve and keep you aligned with your values.",
  [QuestionCategoryId.PersonalResources]:
    "Recognizing your skills and strengths can support confidence and help you draw on them when facing challenges or working toward goals.",
  [QuestionCategoryId.TodayILearned]:
    "Reflecting on what you learned each day supports continuous growth and helps reinforce new insights and skills.",
  [QuestionCategoryId.RefocusHelperToday]:
    "Choosing a clear focus for the day can help you prioritize, manage your time, and feel more accomplished.",
  [QuestionCategoryId.Motivation]:
    "Understanding what motivates you can help you start and keep going when things get hard, which supports progress toward your goals.",
  [QuestionCategoryId.Gratitude]:
    "Practicing gratitude can support well-being by helping you notice positives, which may boost mood and reduce stress.",
  [QuestionCategoryId.HelpfulTools]:
    "Identifying tools that can help you work more efficiently can save you time and reduce stress. It can also enhance your skills and productivity.",
  [QuestionCategoryId.CalmingThoughts]:
    "Cultivating calming thoughts can help you manage stress and anxiety and support relaxation.",
  [QuestionCategoryId.PositiveThoughts]:
    "Fostering helpful, realistic thoughts can support your mood and resilience and make stress feel more manageable.",
  [QuestionCategoryId.GoodToday]:
    "Reflecting on the good aspects of your day can lift your mood and support well-being. It helps you appreciate positive moments, no matter how small they may be.",
  [QuestionCategoryId.GoodPlans]:
    "Making good plans can provide a sense of direction and reduce anxiety about the future. It can also increase your motivation to take action towards your goals.",
  [QuestionCategoryId.GoodPlansToday]:
    "Planning your day can help you manage your time effectively and reduce stress. It also ensures that you focus on your most important tasks.",
  [QuestionCategoryId.GoalForTheWeek]:
    "Setting weekly goals can provide a sense of direction and purpose. It can also enhance your motivation and productivity throughout the week.",
  [QuestionCategoryId.UnderstandingProcrastination]:
    "Understanding why you procrastinate can help you develop strategies to manage it. This can improve your productivity and reduce feelings of guilt and stress associated with procrastination.",
  [QuestionCategoryId.SelfDiscovery]:
    "Self-discovery helps you understand your needs, desires, and motivations. It can support better decision-making and overall well-being.",
  [QuestionCategoryId.Insomnia]:
    "Understanding and addressing insomnia is crucial for your physical health and mental well-being. Good sleep is essential for cognitive function, mood regulation, and overall health.",
  [QuestionCategoryId.SleepWindDown]:
    "Writing down loose thoughts before sleep can reduce the need to keep them in working memory and make it easier to leave the day alone for the night.",
  [QuestionCategoryId.SelfImprovement]:
    "Small, intentional changes compound over time. Reflecting on who you want to become can help you take meaningful steps and stay aligned with your values.",
  [QuestionCategoryId.Relationships]:
    "Strong relationships are one of the biggest contributors to a happy life. Reflecting on the people around you can help you nurture connection, set boundaries, and feel more supported.",
  [QuestionCategoryId.MindfulEating]:
    "Paying attention to how and what you eat can help you notice hunger and fullness cues, enjoy your food more, and build a healthier relationship with eating.",
  [QuestionCategoryId.XEnergyLevelToday]:
    "Tracking your energy level can help you notice patterns (sleep, workload, habits) and plan demanding tasks for times when you tend to feel best.",
  [QuestionCategoryId.XBrowsingBehaviorHappiness]:
    "Monitoring your browsing behaviors is beneficial as it can help identify patterns and habits, some of which may be unproductive or time-consuming. By understanding these behaviors, you can make conscious efforts to improve your online habits, leading to better productivity and time management.",
  // NO save questions
  [QuestionCategoryId.XSelfAssessment]:
    "Self-assessment can help you reflect and build self-awareness. Over time, this can highlight areas to adjust, support stress management, and encourage healthier choices.",
  [QuestionCategoryId.XAppUsageHappiness]:
    "Monitoring your app usage behaviors is beneficial as it can help identify patterns and habits, some of which may be unproductive or time-consuming. By understanding these behaviors, you can make conscious efforts to improve your digital habits, leading to better productivity and time management.",
  [QuestionCategoryId.XEmotionLabeling]:
    "Labeling your emotions helps you develop emotional awareness and regulation skills. By identifying what you feel and where you feel it in your body, you can better understand your emotional patterns and respond to difficult feelings with greater clarity and self-compassion.",
};
