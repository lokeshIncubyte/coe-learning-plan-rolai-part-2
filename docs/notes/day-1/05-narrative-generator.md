# Building a Narrative Generator in TypeScript

## Overview

A narrative generator uses the OpenAI API to produce a series of connected story beats. Each beat is a short passage that advances the narrative while staying consistent with the established theme, world, and style.

**What we're building:**
- A TypeScript script that takes a story premise
- Injects meta directives and style config into the system prompt
- Generates 3 story beats using chained API calls
- Each beat feeds into the context for the next, ensuring continuity

---

## Project Structure

```
narrative-generator/
  src/
    config/
      meta-config.ts      # MetaDirectivesConfig object
      style-config.ts     # StyleGuideConfig object
    lib/
      build-prompt.ts     # buildSystemPrompt() function
    generate.ts           # Main entry point
  package.json
  tsconfig.json
```

---

## Config Files

### `src/config/meta-config.ts`

```typescript
export interface MetaDirectivesConfig {
  theme: string;
  identity: string;
  corePrinciples: string[];
  persistentInstructions: string[];
}

export const metaDirectives: MetaDirectivesConfig = {
  theme: "A solarpunk future where communities rebuild civilization through cooperative technology",
  identity: "You are a narrative engine generating short story beats set in this world.",
  corePrinciples: [
    "The world is hopeful — not utopian, but actively healing",
    "Technology serves people, not the other way around",
    "Conflict exists but resolution is always possible",
  ],
  persistentInstructions: [
    "Stay within the established world at all times",
    "Keep each beat to 2–3 paragraphs",
    "End each beat with a moment of sensory grounding",
  ],
};
```

---

### `src/config/style-config.ts`

```typescript
export interface StyleGuideConfig {
  voice: string;
  tone: string;
  formatRules: string[];
  pacing: string;
}

export const styleGuide: StyleGuideConfig = {
  voice: "Third-person limited, close to the protagonist",
  tone: "Earnest and grounded with occasional quiet humor",
  formatRules: [
    "Paragraphs should be 3–4 sentences maximum",
    "Avoid adverbs — use stronger verbs",
    "Dialogue should feel natural, not theatrical",
  ],
  pacing: "Measured. Short sentences for tension, longer for atmosphere.",
};
```

---

## System Prompt Builder

### `src/lib/build-prompt.ts`

```typescript
import type { MetaDirectivesConfig } from "../config/meta-config";
import type { StyleGuideConfig } from "../config/style-config";

export function buildSystemPrompt(
  meta: MetaDirectivesConfig,
  style: StyleGuideConfig
): string {
  return `
## World & Identity
${meta.identity}

**Theme:** ${meta.theme}

**Core Principles:**
${meta.corePrinciples.map((p) => `- ${p}`).join("\n")}

**Persistent Instructions:**
${meta.persistentInstructions.map((i) => `- ${i}`).join("\n")}

## Style Guide
**Voice:** ${style.voice}
**Tone:** ${style.tone}
**Pacing:** ${style.pacing}

**Format Rules:**
${style.formatRules.map((r) => `- ${r}`).join("\n")}
`.trim();
}
```

---

## Main Generator

### `src/generate.ts`

```typescript
import OpenAI from "openai";
import { metaDirectives } from "./config/meta-config";
import { styleGuide } from "./config/style-config";
import { buildSystemPrompt } from "./lib/build-prompt";

const client = new OpenAI();

type Message = OpenAI.Chat.ChatCompletionMessageParam;

// Prompts for each story beat
const BEAT_PROMPTS = [
  "Write Beat 1 (Opening): Introduce the protagonist arriving at a coastal repair commune for the first time.",
  "Write Beat 2 (Rising Action): The protagonist discovers a broken tidal generator that threatens the commune's power supply.",
  "Write Beat 3 (Resolution): The protagonist works alongside the commune to repair the generator before nightfall.",
];

async function generateBeat(
  systemPrompt: string,
  history: Message[],
  beatPrompt: string
): Promise<string> {
  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: beatPrompt },
  ];

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.85,
    max_tokens: 400,
  });

  return response.choices[0].message.content ?? "";
}

async function generateNarrative(premise: string): Promise<void> {
  const systemPrompt = buildSystemPrompt(metaDirectives, styleGuide);
  const conversationHistory: Message[] = [];

  console.log(`\n=== NARRATIVE GENERATOR ===`);
  console.log(`Premise: ${premise}\n`);

  // Add premise as the first user message context
  conversationHistory.push({
    role: "user",
    content: `Story premise: ${premise}. You will generate this story in 3 beats when prompted.`,
  });
  conversationHistory.push({
    role: "assistant",
    content: "Understood. I'm ready to generate the story beats.",
  });

  // Generate each beat, feeding previous beats into context
  for (let i = 0; i < BEAT_PROMPTS.length; i++) {
    const beatNumber = i + 1;
    console.log(`--- Beat ${beatNumber} ---`);

    const beat = await generateBeat(
      systemPrompt,
      conversationHistory,
      BEAT_PROMPTS[i]
    );

    console.log(beat);
    console.log();

    // Add this beat to conversation history for the next iteration
    conversationHistory.push({ role: "user", content: BEAT_PROMPTS[i] });
    conversationHistory.push({ role: "assistant", content: beat });
  }

  console.log("=== END OF NARRATIVE ===");
}

// Entry point
generateNarrative(
  "A young engineer named Sela travels to the Adriatic coast to join a commune specializing in ocean-powered infrastructure."
).catch(console.error);
```

---

## Running the Script

```bash
# Install dependencies
npm install openai

# Set your API key
export OPENAI_API_KEY=sk-proj-...

# Run
npx ts-node src/generate.ts
```

---

## How Context Chaining Works

Each beat builds on the previous ones by including all prior exchanges in the `messages` array:

```
Request for Beat 1:
  [system] [premise user] [premise assistant] [beat1 prompt]

Request for Beat 2:
  [system] [premise user] [premise assistant] [beat1 prompt] [beat1 response] [beat2 prompt]

Request for Beat 3:
  [system] [premise user] [premise assistant] [beat1 prompt] [beat1 response]
           [beat2 prompt] [beat2 response] [beat3 prompt]
```

This ensures the model "remembers" what it wrote in earlier beats and maintains narrative continuity.

---

## Variations and Extensions

### Parallel generation (no continuity needed)
If beats are independent (e.g., character profiles), generate all at once:

```typescript
const beatPromises = BEAT_PROMPTS.map((prompt) =>
  generateBeat(systemPrompt, [], prompt)
);
const beats = await Promise.all(beatPromises);
```

### Dynamic beat count
```typescript
async function generateNBeats(n: number, premise: string): Promise<string[]> {
  const beats: string[] = [];
  const history: Message[] = [];

  for (let i = 0; i < n; i++) {
    const prompt = `Write beat ${i + 1} of ${n} continuing the narrative.`;
    const beat = await generateBeat(systemPrompt, history, prompt);
    beats.push(beat);
    history.push({ role: "user", content: prompt });
    history.push({ role: "assistant", content: beat });
  }

  return beats;
}
```

### Write output to file
```typescript
import { writeFileSync } from "fs";

writeFileSync(
  "output/narrative.md",
  beats.map((b, i) => `## Beat ${i + 1}\n\n${b}`).join("\n\n")
);
```

---

## Key Design Principles

- **System prompt is built once** — configs are assembled before the loop, not rebuilt per beat
- **History grows incrementally** — each completed beat is appended before the next request
- **Separation of concerns** — config, prompt building, and generation are in separate files
- **Graceful exit** — the loop ends naturally; no recursion or complex state machines needed
