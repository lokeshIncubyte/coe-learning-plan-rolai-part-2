import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../.env") });
import OpenAI from "openai";
import { metaDirectives } from "./meta-directives";
import { styleGuide } from "./style-guide";

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

function buildSystemPrompt(): string {
  return `
You are a narrative engine for a ${metaDirectives.genre} story.

THEME: ${metaDirectives.theme}
SETTING: ${metaDirectives.setting}

CORE PRINCIPLES:
${metaDirectives.corePrinciples.map((p) => `- ${p}`).join("\n")}

WORLD RULES:
${metaDirectives.worldRules.map((r) => `- ${r}`).join("\n")}

STYLE GUIDE:
- Voice: ${styleGuide.voice}
- Tone: ${styleGuide.tone}
- POV: ${styleGuide.pointOfView}
- Sentences: ${styleGuide.sentenceStyle}

FORMAT RULES:
${styleGuide.formatRules.map((r) => `- ${r}`).join("\n")}

AVOID:
${styleGuide.avoid.map((a) => `- ${a}`).join("\n")}
`.trim();
}

const beatPrompts = [
  "Write beat 1: the call to adventure. A young villager stumbles upon a mysterious map and feels the first spark of curiosity.",
  "Write beat 2: the journey. The villager faces a tricky obstacle and discovers an unexpected friend who helps them through.",
  "Write beat 3: the triumph. The villager reaches their goal and shares the reward with their community.",
];

async function generateNarrative() {
  const systemPrompt = buildSystemPrompt();
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  console.log("=".repeat(60));
  console.log("NARRATIVE GENERATOR — Day 1");
  console.log("=".repeat(60));

  for (let i = 0; i < beatPrompts.length; i++) {
    const response = await client.chat.completions.create({
      model: "openai/gpt-4o-mini",
      temperature: 0.8,
      max_tokens: 200,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: beatPrompts[i] },
      ],
    });

    const beat = response.choices[0].message.content ?? "";
    const usage = response.usage!;
    totalPromptTokens += usage.prompt_tokens;
    totalCompletionTokens += usage.completion_tokens;

    console.log(`\n--- Beat ${i + 1} ---`);
    console.log(beat);
    console.log(`[tokens: ${usage.prompt_tokens}p / ${usage.completion_tokens}c]`);
  }

  console.log("\n" + "=".repeat(60));
  console.log(`TOTAL TOKENS — prompt: ${totalPromptTokens}, completion: ${totalCompletionTokens}`);
  console.log(`EST. COST    — $${((totalPromptTokens * 0.00000015) + (totalCompletionTokens * 0.0000006)).toFixed(6)}`);
  console.log("=".repeat(60));
}

generateNarrative().catch((err) => {
  if (err instanceof OpenAI.APIError) {
    console.error(`OpenAI API error ${err.status}: ${err.message}`);
  } else {
    console.error("Unexpected error:", err);
  }
  process.exit(1);
});
