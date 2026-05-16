# Day 4 Checklist — Mastra Framework + Action Validator + Choice Generator

**Project focus:** AI Chat Assistant (agentic capabilities) + Progressive Gen (validator and choice agents)

---

## 1. Core Learning

- [x] Understand what Mastra is and why agentic frameworks exist
- [x] Understand agents vs simple direct OpenAI API calls
- [x] Learn how to create agents with Mastra (`new Agent({ instructions, model })`)
- [x] Understand agent memory and context management

---

## 2. Mastra Setup

- [x] Install `@mastra/core` in the NestJS project (`^1.34.0`)
- [x] Configure Mastra agents via NestJS factory providers (`AgentsModule`)
- [x] Route agent model calls through OpenRouter (`https://openrouter.ai/api/v1`)
- [x] Read API key from environment (`OPENROUTER_API_KEY`)

---

## 3. ActionValidator Agent

> **File:** `server/src/agents/action-validator.service.ts`

- [x] Build `ActionValidatorService` wrapping a Mastra `Agent`
- [x] Agent instructions: validate whether player actions are physically and narratively possible
- [x] `validate(action, ruleContext?)` method — prepends rule context when provided
- [x] Returns `ValidationOutcome` — Zod-validated schema with `result`, `reason`, `modifiedAction?`
- [x] Validator returns all three states: `accepted` / `modified` / `rejected`
- [x] Unit tests in `action-validator.service.spec.ts`

---

## 4. ChoiceGenerator Agent

> **File:** `server/src/agents/choice-generator.service.ts`

- [x] Build `ChoiceGeneratorService` wrapping a Mastra `Agent`
- [x] Agent instructions: generate 3 narrative choices given the current story beat
- [x] `generateChoices(narrative, worldContext?)` method — prepends world context when provided
- [x] Returns tagged `Choice[]` — each choice has `label`, `entities[]`, `rules[]`
- [x] Unit tests in `choice-generator.service.spec.ts`

---

## 5. Pipeline Integration

> **File:** `server/src/generate/generate.controller.ts`

- [x] `AgentsModule` imported into `GenerateModule`
- [x] Both services injected into `GenerateController` via constructor
- [x] Fetch rule entities from `GraphService` → build `ruleContext` string
- [x] Fetch character, location, object entities → build `worldContext` string
- [x] **POST `/generate`:** validate action before generation; return early on `rejected`
- [x] **POST `/generate`:** call `generateChoices` after narrative is returned; include in response
- [x] **SSE `/generate/stream`:** accumulate full narrative → call `generateChoices` after `done` → emit `{ type: 'choices', choices }` event

---

## 6. Known Gaps (resolved)

- [x] `modified` outcome now uses `modifiedAction` as the effective prompt in both POST and SSE paths
- [x] SSE path now validates with `ActionValidator` before streaming; emits `{ type: 'rejected' }` or `{ type: 'modified' }` events accordingly
- [x] SSE path now passes real `worldContext` (from graph entities) to `choiceGeneratorService`
- [x] Entity-fetching + context-building extracted into shared `buildContexts()` private method

---

## 7. Success Criteria

- [x] Mastra installed and configured in NestJS
- [x] `ActionValidatorService` created and functional
- [x] `ChoiceGeneratorService` created and functional
- [x] Validator returns three-state outcome (`accepted` / `modified` / `rejected`)
- [x] Choice generator produces tagged options (`label`, `entities`, `rules`)
- [x] Agents integrated into pipeline — validator before generation, choices after
- [x] Custom actions validated before narrative generation (POST and SSE paths)
- [x] `modified` outcome uses `modifiedAction` as the effective prompt
- [x] SSE path emits `rejected` / `modified` events before streaming begins
- [x] Contextual choices generated after narrative using real graph entities (both paths)
- [x] Agent endpoints work correctly end-to-end
