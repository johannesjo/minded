import { QuestionCategoryId } from "@src/shared/data/questions";

export const QUESTION_CATEGORY_ADDITIONAL_INFO: {
  [key in QuestionCategoryId]: string;
} = {
  [QuestionCategoryId.HealthierBrowsingHabits]:
    "Understanding and improving your browsing habits can significantly enhance your productivity and mental health. Spending time online wisely can prevent unnecessary stress and distractions, allowing you to focus on tasks that truly matter.",
  [QuestionCategoryId.PersonalResources]:
    "Recognizing your personal resources, such as skills and strengths, can boost your self-esteem and confidence. It can also help you leverage these resources to overcome challenges and achieve your goals.",
  [QuestionCategoryId.TodayILearned]:
    "Reflecting on what you've learned each day promotes continuous learning and intellectual growth. It can also enhance your memory and cognitive skills.",
  [QuestionCategoryId.RefocusHelperToday]:
    "Having a clear focus each day can improve your productivity and sense of accomplishment. It helps you prioritize tasks and manage your time effectively.",
  [QuestionCategoryId.Motivation]:
    "Understanding what motivates you can drive you to take action and persist in the face of difficulties. It's crucial for achieving your goals and maintaining your mental well-being.",
  [QuestionCategoryId.Gratitude]:
    "Practicing gratitude can significantly improve your mental health. It helps you focus on positive aspects of your life, enhancing your happiness and reducing stress.",
  [QuestionCategoryId.HelpfulTools]:
    "Identifying tools that can help you work more efficiently can save you time and reduce stress. It can also enhance your skills and productivity.",
  [QuestionCategoryId.CalmingThoughts]:
    "Cultivating calming thoughts can help manage stress and anxiety. It promotes relaxation and contributes to better mental and physical health.",
  [QuestionCategoryId.PositiveThoughts]:
    "Fostering positive thoughts can improve your mood and outlook on life. It can also reduce the likelihood of experiencing stress and depression.",
  [QuestionCategoryId.GoodToday]:
    "Reflecting on the good aspects of your day can enhance your mood and overall mental health. It helps you appreciate the positive moments, no matter how small they may be.",
  [QuestionCategoryId.GoodPlans]:
    "Making good plans can provide a sense of direction and reduce anxiety about the future. It can also increase your motivation to take action towards your goals.",
  [QuestionCategoryId.GoodPlansToday]:
    "Planning your day can help you manage your time effectively and reduce stress. It also ensures that you focus on your most important tasks.",
  [QuestionCategoryId.GoalForTheWeek]:
    "Setting weekly goals can provide a sense of direction and purpose. It can also enhance your motivation and productivity throughout the week.",
  [QuestionCategoryId.UnderstandingProcrastination]:
    "Understanding why you procrastinate can help you develop strategies to manage it. This can improve your productivity and reduce feelings of guilt and stress associated with procrastination.",
  [QuestionCategoryId.SelfDiscovery]:
    "Self-discovery is crucial for understanding your needs, desires, and motivations. It can lead to better decision-making and improved mental health.",
  [QuestionCategoryId.Insomnia]:
    "Understanding and addressing insomnia is crucial for your physical health and mental well-being. Good sleep is essential for cognitive function, mood regulation, and overall health.",
  [QuestionCategoryId.XEnergyLevelToday]:
    "Monitoring your personal energy level is beneficial as it allows you to understand your body's natural rhythms and optimize your productivity. Additionally, it can help you recognize factors that drain your energy, enabling you to make necessary lifestyle adjustments.",
  [QuestionCategoryId.XBrowsingBehaviorHappiness]:
    "Monitoring your browsing behaviors is beneficial as it can help identify patterns and habits, some of which may be unproductive or time-consuming. By understanding these behaviors, you can make conscious efforts to improve your online habits, leading to better productivity and time management.",
  // NO save questions
  [QuestionCategoryId.XMoodCheckin]:
    "Mood tracking can be beneficial as it provides insights into emotional patterns and triggers, helping you better manage your mental health. By understanding your mood fluctuations, you can implement strategies to enhance positive emotions and mitigate negative ones.",
  [QuestionCategoryId.XXPurposeOfSession]: "",
};
