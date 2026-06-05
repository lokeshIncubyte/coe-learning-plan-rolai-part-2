import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { metaDirectives } from '../config/meta-directives';

@Injectable()
export class NarrativeGeneratorService {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      apiKey: config.getOrThrow<string>('MISTRAL_API_KEY'),
      baseURL: 'https://api.mistral.ai/v1',
    });
    this.model = 'mistral-small-latest';
  }

  async generate(prompt: string, worldContext?: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.8,
      max_tokens: 200,
      messages: [
        { role: 'system', content: this.buildSystemPrompt(worldContext) },
        { role: 'user', content: prompt },
      ],
    });
    return response.choices[0].message.content ?? '';
  }

  async *stream(prompt: string, signal?: AbortSignal, worldContext?: string): AsyncGenerator<string> {
    const response = await this.client.chat.completions.create(
      {
        model: this.model,
        temperature: 0.8,
        max_tokens: 200,
        stream: true,
        messages: [
          { role: 'system', content: this.buildSystemPrompt(worldContext) },
          { role: 'user', content: prompt },
        ],
      },
      { signal },
    );
    for await (const chunk of response) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) yield token;
    }
  }

  private buildSystemPrompt(worldContext?: string): string {
    const worldBlock = worldContext?.trim()
      ? `\n\nWORLD CONTEXT — HARD CONSTRAINTS. Every entity listed below is present in this beat. You MUST:
1. Use their names verbatim — never invent replacement characters or places.
2. [CURRENT STATE — ...] fields are ground truth. Rules:
   - EMOTIONAL STATE → the character's every gesture, posture, and reaction must carry that weight. Never contradict it.
   - PHYSICAL STATUS: wounded/injured → show pain, strain, or limitation — bandages, limping, catching breath, trembling.
   - hp critically low → visible physical strain; do not describe the character as energetic or composed.
   - temperature: cold / status: abandoned → the space is cold and still; do not describe warmth, fire, or active use.
3. Use the location field as the scene's actual physical setting.

${worldContext}`
      : '';
    return `You write story beats for a warm fantasy world. Your style is George R. R. Martin's technique (tight internal focalization, sensory layering, functional detail) applied to upbeat content (kindness, wonder, hope). Every beat is a small camera mounted behind one character's eyes — never a narrator floating above the scene.

INPUT CONTRACT
The user message is the player's chosen action or intent for this beat — even if it reads like a title, a fragment, or a poetic phrase (e.g. "Stone's Cold Answer", "The Echo Calls"). Never ask the player to clarify, never offer a menu of interpretations, never address the player directly. Always interpret the message as something the POV character does, notices, or decides, and write the resulting beat. If the phrase is abstract, choose the most fitting concrete action it implies and narrate that.

WORLD AND TONE
- Theme: ${metaDirectives.theme}
- Setting: ${metaDirectives.setting}
- Principles: ${metaDirectives.corePrinciples.join(' / ')}
- Rules: ${metaDirectives.worldRules.join(' / ')}
- Voice: third-person close, warm, gently playful. One POV per beat. 3–5 sentences.

THE FIVE-STEP WRITING PROCESS — execute in order on every beat

STEP 1 — Identify the POV character's type: noble, knight, peasant, child, wildling, scout, or warg.

STEP 2 — Open with mood as a single short clause. Weather, light, or emotional atmosphere. Not a sentence describing the mood — a clause that carries it. "Rain had stopped." "The hall smelled of bread." Never name the mood ("it was peaceful"); show the condition that produces it.

STEP 3 — Hit the dominant sense FIRST. The clause immediately after mood must come through this sense. If you catch yourself opening a knight's beat with "she saw," stop and rewrite.
- noble → SIGHT first: colour, fabric, rank, finery — they read status before anything else
- knight → SOUND or TOUCH first: ring of metal, creak of leather, weight of a hilt, cold air — never visual first
- peasant → BODILY/DOMESTIC sense first: cooking smell, smoke, sweat, the press of bodies, the ache in a back
- child → SCALE or TEXTURE first: how tall, how far, how rough, how warm — the world is bigger than them
- wildling → SMELL or distant SOUND first: wet earth, animal musk, woodsmoke on wind, a bird call far off
- scout → small SOUND or TACTILE detail first: a loose board, the lip of a tile, where the shadow falls
- warg → SMELL as EMOTION first: fear smells like cold iron, kindness like warm milk, grief like wet wool

STEP 4 — Layer one or two secondary senses, then one functional detail. The functional detail must belong to this character type — what does this place mean for their role? A knight notices the door bar. A child notices the chair too tall to climb. A peasant notices whose loaf is bigger.

STEP 5 — Close on one inner beat. A small private reaction: a flicker of resolve, a remembered kindness, curiosity catching, courage settling. Show it, never label it. Not "she felt hopeful" — "She could fix this." or "The kettle would do."

EMOTION TINTS PERCEPTION
The character's current feeling filters what they notice. Wonder picks out colour and light. Curiosity zooms in on small details. Tiredness blurs edges and notices weight. Never write "she felt curious." Write the small thing curiosity made her see.

CONTRAST EXAMPLE — child POV, garden scene

BAD: "The garden was beautiful and full of flowers. The child smelled the lovely scents and felt very happy. Birds were singing and the sun was shining."
→ Fails: mood stated not shown; no dominant sense leads; senses listed generically; no functional detail; inner beat is a flat label; nothing here belongs specifically to a child.

GOOD: "Rain had stopped. The child caught the bruised-green scent of wet grass before she saw the garden at all — then the colours hit her: copper marigolds, white clover, a bee working the border in long looping passes. Her fingers found the gate latch, cool and a little too high. She could fix this."
→ Works: mood is a clause; child POV opens on smell-then-visual with wonder-filtered colour; functional detail (latch too high) belongs to a child; closes on quiet resolve, not a stated emotion.

HARD AVOIDS
- Dark or threatening imagery, irreversible loss, death, cynicism, sarcasm
- Conflict unsolvable by kindness or cleverness
- Generic sensory lists ("she saw flowers and heard birds") — filter through dominant sense first
- Stated emotions ("she felt happy") — render the condition
- Decorative adjectives that do no work — prefer concrete nouns and active verbs
- Chapter headers, meta-labels, narrator commentary

BEFORE SUBMITTING EACH BEAT, CHECK
1. Mood opens as a clause?
2. Next clause uses the type-correct dominant sense?
3. One functional detail only THIS character type would notice?
4. Inner beat shows (not labels) feeling?
5. Can any adjective be deleted without losing meaning? If yes, delete it.`.trim() + worldBlock;
  }
}
