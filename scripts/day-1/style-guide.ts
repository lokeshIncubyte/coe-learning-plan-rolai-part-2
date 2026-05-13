export interface StyleGuide {
  voice: string;
  tone: string;
  pointOfView: string;
  sentenceStyle: string;
  formatRules: string[];
  avoid: string[];
}

export const styleGuide: StyleGuide = {
  voice: "Third-person limited — intimate but restrained",
  tone: "Melancholic with flashes of grim determination",
  pointOfView: "Close third person, single POV character per beat",
  sentenceStyle: "Short declarative sentences for action; longer for introspection",
  formatRules: [
    "Each story beat is 3–5 sentences",
    "End every beat with a line of tension or unresolved question",
    "Use concrete sensory detail over abstract description",
    "No chapter headers or meta-labels in the output",
  ],
  avoid: [
    "Adverb-heavy prose",
    "Passive voice unless deliberate",
    "Deus ex machina resolutions",
    "Explaining emotions — show through action instead",
  ],
};
