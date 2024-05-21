export interface EmojiEntry {
  i: string;
  d: string;
}

export enum EmojiCategory {
  Positive,
  Excited,
  Neutral,
  Negative,
  Various,
}

export const EMOIJI_CATEGORIES_SORTED: EmojiCategory[] = [
  EmojiCategory.Excited,
  EmojiCategory.Positive,
  EmojiCategory.Neutral,
  // EmojiCategory.Various,
  EmojiCategory.Negative,
];

export const EMOIJI_CATEGORIES: {
  [key in EmojiCategory]: EmojiEntry[];
} = {
  [EmojiCategory.Excited]: [
    { i: "🥳", d: "partying" },
    // { i: "🥰", d: "⊛ smiling face with hearts" },
    { i: "😍", d: "enamoured" },
    { i: "🤩", d: "star-struck" },
    { i: "😎", d: "confident" },
  ],
  [EmojiCategory.Positive]: [
    { i: "😁", d: "amused" },
    { i: "😄", d: "joyful" },
    { i: "😀", d: "happy" },
    // { i: "😊", d: "happy" },
    { i: "🙂", d: "content" },
    { i: "🙃", d: "cheeky happy" },
    { i: "🤭", d: "secretly amused" },
    // { i: "😜", d: "winking face with tongue" },
    { i: "😌", d: "relieved" },
    // { i: "😝", d: "squinting face with tongue" },

    // {i: "😃", d: "grinning face with big eyes",},
    // {i: "😆", d: "grinning squinting",},
    // {i: "😅", d: "grinning face with sweat",},
    // {i: "🤣", d: "rolling on the floor laughing",},
    // {i: "😂", d: "face with tears of joy",},
  ],
  [EmojiCategory.Neutral]: [
    { i: "😐", d: "neutral" },
    { i: "🤨", d: "skeptical" },
    { i: "🤪", d: "zany" },
    { i: "🤔", d: "thinking" },
    { i: "😴", d: "tired" },
    // { i: "😑", d: "expressionless" },
    // { i: "😒", d: "unamused" },
  ],
  [EmojiCategory.Negative]: [
    { i: "🙁", d: "slightly sad" },
    { i: "😕", d: "confused" },
    { i: "😔", d: "pensive" },
    { i: "😟", d: "worried" },
    { i: "😞", d: "disappointed" },
    // { i: "😓", d: "downcast face with sweat" },
    { i: "😩", d: "weary" },
    // { i: "😫", d: "tired" },
    { i: "😬", d: "uneasy" },
    // { i: "🙄", d: "face with rolling eyes" },
    // { i: "😡", d: "pouting" },
    { i: "😠", d: "angry" },
    // { i: "👿", d: "angry face with horns" },
    // { i: "😤", d: "angry" },
    // { i: "☠", d: "skull and crossbones" },

    // { i: "☹", d: "frowning" },
    // { i: "😮", d: "face with open mouth" },
    // { i: "😯", d: "hushed" },
    // { i: "😲", d: "astonished" },
    { i: "😳", d: "flushed" },
    // { i: "🥺", d: "pleading" },
    // { i: "😦", d: "frowning face with open mouth" },
    { i: "😧", d: "anguished" },
    // { i: "😰", d: "anxious face with sweat" },
    { i: "😖", d: "confounded" },
    // { i: "😣", d: "persevering" },
    // { i: "😥", d: "sad but relieved" },
    { i: "😢", d: "sad" },
    { i: "😭", d: "very sad" },
    { i: "😨", d: "fearful" },
    { i: "😱", d: "very fearful" },
  ],
  [EmojiCategory.Various]: [
    // { i: "🧐", d: "face with monocle" },
    // { i: "🤓", d: "nerd" },
    // { i: "🤠", d: "cowboy hat" },
    // { i: "😪", d: "sleepy" },
    // { i: "🤡", d: "clown" },
    // { i: "🤒", d: "face with thermometer" },
    // { i: "🤢", d: "nauseated" },
    // { i: "🥵", d: "⊛ hot" },
    // { i: "🥶", d: "⊛ cold" },
    // { i: "😵", d: "dizzy" },
  ],
};
