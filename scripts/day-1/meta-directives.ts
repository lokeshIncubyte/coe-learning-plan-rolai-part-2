export interface MetaDirectives {
  theme: string;
  genre: string;
  corePrinciples: string[];
  worldRules: string[];
  setting: string;
}

export const metaDirectives: MetaDirectives = {
  theme: "Courage and kindness light the way — every good deed ripples outward",
  genre: "Upbeat safe fantasy",
  corePrinciples: [
    "Heroes are defined by compassion, not power",
    "Mistakes are lessons, not punishments",
    "Friendship and community solve what strength alone cannot",
  ],
  worldRules: [
    "Magic is fuelled by genuine acts of kindness",
    "Every creature, however small, has a role to play",
    "Peace is the natural state; conflict is a puzzle to be solved, not a war to be won",
  ],
  setting: "A sun-warmed kingdom of rolling meadows, talking animals, and ever-blooming gardens",
};
