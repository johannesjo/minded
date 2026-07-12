export interface Quote {
  author?: string;
  txt: string;
}

/**
 * A small, curated pool — deliberately NOT a quote-of-the-day machine (see
 * docs/widget-prompts-concept.md's cut list). These rotate on the dashboard
 * greeting, so the bar is: calm, present-moment, non-striving — never
 * hustle/discipline/self-improvement quotes. Grow slowly and editorially.
 */
export const QUOTES: Quote[] = [
  {
    author: "Thich Nhat Hanh",
    txt: "Sometimes your joy is the source of your smile, but sometimes your smile can be the source of your joy.",
  },
  {
    author: "Thich Nhat Hanh",
    txt: "Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor.",
  },
  {
    author: "Thich Nhat Hanh",
    txt: "Drink your tea slowly and reverently, as if it is the axis on which the earth revolves — slowly, evenly, without rushing toward the future.",
  },
  {
    author: "Jon Kabat-Zinn",
    txt: "You can't stop the waves, but you can learn to surf.",
  },
  {
    author: "Rumi",
    txt: "The quieter you become, the more you are able to hear.",
  },
  {
    author: "Lao Tzu",
    txt: "Nature does not hurry, yet everything is accomplished.",
  },
  {
    author: "Pema Chödrön",
    txt: "You are the sky. Everything else is just the weather.",
  },
  {
    author: "Mary Oliver",
    txt: "Attention is the beginning of devotion.",
  },
];
