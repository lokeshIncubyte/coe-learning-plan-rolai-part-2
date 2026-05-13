export interface MetaDirectives {
  theme: string;
  genre: string;
  corePrinciples: string[];
  worldRules: string[];
  setting: string;
}

export const metaDirectives: MetaDirectives = {
  theme: "Redemption through sacrifice — every choice has a permanent cost",
  genre: "Dark fantasy",
  corePrinciples: [
    "Moral ambiguity over clear heroes and villains",
    "Consequences are irreversible; the world remembers",
    "Hope exists, but it is fragile and hard-won",
  ],
  worldRules: [
    "Magic drains life force — using it ages the caster",
    "The dead can speak, but only once after death",
    "No kingdom has survived more than three generations of peace",
  ],
  setting: "A crumbling empire at the edge of an endless winter",
};
