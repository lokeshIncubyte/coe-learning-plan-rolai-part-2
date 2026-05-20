# Day 4 — Mastra Framework + Action Validator + Choice Generator

## New Technologies & Patterns

### 1. Agentic Framework — What Mastra Adds

Without a framework, you call the LLM directly and parse free-text output manually.
With Mastra, you define an Agent (instructions + model) and get back a typed object:

```
  Direct LLM call (Day 1-3 approach):
  ┌──────────────────────────────────────────────────────┐
  │ const res = await openai.chat.completions.create(..) │
  │ const text = res.choices[0].message.content          │
  │ // Now what? Parse "accepted" or "rejected" from text│
  │ // Fragile — any wording change breaks the parser    │
  └──────────────────────────────────────────────────────┘

  Mastra Agent (Day 4 approach):
  ┌──────────────────────────────────────────────────────┐
  │ const result = await agent.generate(prompt, {        │
  │   output: { schema: ValidationOutcomeSchema }        │
  │ })                                                   │
  │ // result.object is already typed & Zod-validated:   │
  │ // { result: 'accepted' | 'modified' | 'rejected',  │
  │ //   reason: string, modifiedAction?: string }       │
  └──────────────────────────────────────────────────────┘
```

---

### 2. Structured Output — Zod Schema Enforcement

Mastra uses Zod schemas to force the LLM to return a specific JSON shape.
The framework handles the prompt engineering for structured output internally.

```
  Zod Schema Definition          LLM Response (guaranteed shape)
  ┌──────────────────────┐       ┌──────────────────────────────┐
  │ z.object({            │  ──►  │ {                            │
  │   result: z.enum([    │       │   "result": "accepted",      │
  │     'accepted',       │       │   "reason": "This is a       │
  │     'modified',       │       │              plausible move" │
  │     'rejected'        │       │ }                            │
  │   ]),                 │       └──────────────────────────────┘
  │   reason: z.string(), │
  │   modifiedAction:     │       If the LLM returns something else,
  │     z.string()        │       Mastra retries until the schema passes.
  │     .optional()       │
  │ })                    │
  └──────────────────────┘
```

---

### 3. Two Agents in This Project

```
  ┌─────────────────────────────────────────────────────────────┐
  │  AgentsModule (NestJS)                                       │
  │                                                             │
  │  ActionValidatorAgent            ChoiceGeneratorAgent       │
  │  ┌──────────────────────┐        ┌──────────────────────┐  │
  │  │ model: gpt-4o-mini   │        │ model: gpt-4o-mini   │  │
  │  │ via OpenRouter       │        │ via OpenRouter       │  │
  │  │                      │        │                      │  │
  │  │ Instructions:        │        │ Instructions:        │  │
  │  │ "Validate whether    │        │ "Generate 3 choices  │  │
  │  │  player actions are  │        │  for the player      │  │
  │  │  physically and      │        │  given the current   │  │
  │  │  narratively         │        │  story beat."        │  │
  │  │  plausible."         │        │                      │  │
  │  │                      │        │ Output schema:       │  │
  │  │ Output schema:       │        │ Choice[] where each  │  │
  │  │ ValidationOutcome    │        │ has label, entities, │  │
  │  │ { result, reason,    │        │ rules[]              │  │
  │  │   modifiedAction? }  │        └──────────────────────┘  │
  │  └──────────────────────┘                                   │
  └─────────────────────────────────────────────────────────────┘
```

---

### 4. Pipeline Integration — Where Agents Fit

```
  POST /generate (or SSE /generate/stream)
            │
            ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  GenerateController                                          │
  │                                                             │
  │  1. buildContexts()                                         │
  │     ├── GraphService.getEntitiesByType('rule')              │
  │     │   → "RULES:\n- no_magic: magic is forbidden\n..."     │
  │     └── GraphService.getEntitiesByType(char/loc/obj)        │
  │         → "WORLD:\n- Arthur (character)\n- Castle (loc)\n..." │
  │                                                             │
  │  2. ActionValidatorService.validate(action, ruleContext)    │
  │        │                                                    │
  │        ├── result: 'rejected' → return early               │
  │        ├── result: 'modified' → use modifiedAction instead  │
  │        └── result: 'accepted' → continue                   │
  │                                                             │
  │  3. NarrativeGeneratorService.generate/stream(prompt)       │
  │        │                                                    │
  │        └── OpenAI streaming (from Day 3)                    │
  │                                                             │
  │  4. ChoiceGeneratorService.generateChoices(narrative, world) │
  │        │                                                    │
  │        └── returns 3 labeled choices with entity/rule tags  │
  └─────────────────────────────────────────────────────────────┘
```

---

### 5. Three-State Validator Flow

```
  Player types: "I fly to the moon"
          │
          ▼
  ActionValidatorAgent
          │
          ├──► accepted   → narrative generates from original action
          │
          ├──► modified   → "I climb to the highest tower"
          │                  narrative generates from modifiedAction
          │                  SSE emits { type: 'modified', ... } first
          │
          └──► rejected   → pipeline stops
                            SSE emits { type: 'rejected', reason: '...' }
                            client shows rejection message, no narrative
```

---

### 6. NestJS Dependency Injection Wiring

```
  AgentsModule
  ┌────────────────────────────────────────────┐
  │  providers:                                 │
  │    ACTION_VALIDATOR_AGENT  (factory)        │
  │    CHOICE_GENERATOR_AGENT  (factory)        │
  │    ActionValidatorService                   │
  │    ChoiceGeneratorService                   │
  │                                             │
  │  exports: both services + agent tokens      │
  └───────────────────────┬────────────────────┘
                          │ imported by
                          ▼
  GenerateModule ──► GenerateController
    injects ActionValidatorService
    injects ChoiceGeneratorService
```

---

## Key Files

| File | What it does |
|---|---|
| `server/src/agents/agents.module.ts` | Creates Mastra Agent instances as NestJS factory providers |
| `server/src/agents/action-validator.service.ts` | Wraps agent with `validate(action, ruleContext?)` |
| `server/src/agents/choice-generator.service.ts` | Wraps agent with `generateChoices(narrative, worldContext?)` |
| `server/src/generate/generate.controller.ts` | Calls both agents in the request pipeline |
