# Meta Directives and Style Config

## What Are Meta Directives?

Meta directives are high-level, persistent instructions that define the **identity and purpose** of your AI application. They are not about how the output sounds — they are about what the model fundamentally is and what it cares about across every interaction.

Think of meta directives as the constitution of your AI: they don't change per request, they define the invariants.

**Meta directives typically include:**
- **Theme** — The overarching subject, world, or creative universe
- **Core principles** — Non-negotiable values (e.g., "always stay in-world", "never break immersion")
- **Persistent instructions** — Behavioral rules that apply to every single output
- **Identity** — Who or what the model is in this context

---

## What Is a Style Guide Config?

A style guide config defines **how the output is written** — the voice, tone, format, and language patterns that make your content feel consistent and on-brand.

**Style guide config typically includes:**
- **Voice** — Active/passive, first/second/third person, formal/casual
- **Tone** — Emotional register (e.g., earnest, sardonic, whimsical, terse)
- **Format rules** — Paragraph length, use of lists, capitalization, punctuation habits
- **Vocabulary preferences** — Words to use or avoid
- **Pacing** — Sentence rhythm, long vs. short sentences

---

## TypeScript Config Objects

### Meta Directives Config

```typescript
interface MetaDirectivesConfig {
  theme: string;
  corePrinciples: string[];
  persistentInstructions: string[];
  identity: string;
}

const metaDirectives: MetaDirectivesConfig = {
  theme: "A solarpunk future where communities rebuild civilization through cooperative technology",
  identity: "You are a narrative engine generating story content set in this world.",
  corePrinciples: [
    "The world is hopeful — not utopian, but actively healing",
    "Technology serves people, not the other way around",
    "Communities are diverse and cooperative, not homogeneous",
    "Conflict exists but is not nihilistic — resolution is always possible",
  ],
  persistentInstructions: [
    "Stay within the established world at all times",
    "Never introduce elements that contradict the core principles",
    "All character names should feel multicultural and grounded",
    "Environmental details should reinforce the solarpunk aesthetic",
  ],
};
```

---

### Style Guide Config

```typescript
interface StyleGuideConfig {
  voice: string;
  tone: string;
  formatRules: string[];
  vocabularyPreferences: {
    preferred: string[];
    avoid: string[];
  };
  pacing: string;
}

const styleGuide: StyleGuideConfig = {
  voice: "Third-person limited, close to the protagonist's perspective",
  tone: "Earnest and grounded with occasional wry humor. Never ironic about hope.",
  formatRules: [
    "Paragraphs should be 3–5 sentences maximum",
    "Use present tense for action, past tense for reflection",
    "Dialogue should feel natural and unpolished, not theatrical",
    "Avoid adverbs — use stronger verbs instead",
    "End each story beat with a sensory detail or a quiet moment",
  ],
  vocabularyPreferences: {
    preferred: ["craft", "tend", "gather", "build", "share", "grow"],
    avoid: ["utilize", "leverage", "synergy", "disrupt", "hack"],
  },
  pacing: "Measured and deliberate. Short sentences for tension, longer ones for atmosphere.",
};
```

---

## Injecting Configs into the System Prompt

The system prompt is where both configs come together. You serialize them into a natural-language instruction block and inject them at the top of every request.

### Injection Function

```typescript
function buildSystemPrompt(
  meta: MetaDirectivesConfig,
  style: StyleGuideConfig
): string {
  const metaSection = `
## World & Identity
${meta.identity}

**Theme:** ${meta.theme}

**Core Principles:**
${meta.corePrinciples.map((p) => `- ${p}`).join("\n")}

**Persistent Instructions:**
${meta.persistentInstructions.map((i) => `- ${i}`).join("\n")}
`.trim();

  const styleSection = `
## Style Guide
**Voice:** ${style.voice}
**Tone:** ${style.tone}
**Pacing:** ${style.pacing}

**Format Rules:**
${style.formatRules.map((r) => `- ${r}`).join("\n")}

**Preferred vocabulary:** ${style.vocabularyPreferences.preferred.join(", ")}
**Vocabulary to avoid:** ${style.vocabularyPreferences.avoid.join(", ")}
`.trim();

  return `${metaSection}\n\n${styleSection}`;
}
```

### Usage in a Request

```typescript
import OpenAI from "openai";

const client = new OpenAI();

async function generateWithConfig(userPrompt: string): Promise<string> {
  const systemPrompt = buildSystemPrompt(metaDirectives, styleGuide);

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 400,
  });

  return response.choices[0].message.content ?? "";
}

// Example call
const beat = await generateWithConfig(
  "Write the opening scene of a story where a young engineer arrives at a coastal repair commune."
);
console.log(beat);
```

---

## Why Separate Meta from Style?

| Concern | Meta Directives | Style Guide |
|---|---|---|
| What it controls | Identity, world, values | Voice, tone, format |
| Changes per project? | Yes — defines the project | Sometimes — may be shared across projects |
| Changes per request? | No — constant invariant | No — constant invariant |
| Example | "This is a solarpunk story" | "Use short paragraphs, no adverbs" |

Separating them makes each config easier to swap, test, or override independently. You can keep the same meta theme but experiment with different style guides without touching the world definition.

---

## Practical Tips

- **Validate your configs** — TypeScript interfaces catch missing fields at compile time
- **Keep configs in separate files** — `meta-config.ts` and `style-config.ts` for easy import
- **Version your configs** — Add a `version` field so you can track which config produced which output
- **Test with extremes first** — Try a very formal and a very casual style config to see the range of effect
- **Log the injected system prompt** — When debugging inconsistent output, print the full system prompt to inspect what the model actually received
