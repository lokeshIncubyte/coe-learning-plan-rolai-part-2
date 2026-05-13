# Day 1 Checklist — OpenAI API Basics + Narrative Generator Foundation

**Project focus:** AI Chat Assistant + Progressive Gen (narrative generator core)

---

## 1. Setup

- [x] Get OpenAI API key from platform.openai.com
- [x] Store API key in `.env` file (`OPENAI_API_KEY=...`)
- [x] Install OpenAI SDK (`npm install openai` or equivalent)
- [x] Verify environment loads the key correctly

---

## 2. Core Learning

- [x] Learn OpenAI API fundamentals and authentication flow
- [x] Make first successful API call to Chat Completions endpoint
- [x] Experiment with `temperature` parameter (0 vs 0.7 vs 1.0)
- [x] Experiment with `max_tokens` parameter
- [x] Understand the `messages` array structure
- [x] Understand `system`, `user`, and `assistant` message roles

---

## 3. Config Files

- [x] Create a Meta Directives config file (theme, core principles, world rules)
- [x] Create a Style Guide config file (voice, tone, format rules)
- [x] Ensure both config files are importable/readable at runtime

---

## 4. Narrative Generator

- [x] Build a simple narrative generator script in TypeScript
- [x] Inject meta directives config into the system prompt
- [x] Inject style guide config into the system prompt
- [x] Generate 3 story beats in a single run
- [x] Verify consistent theme and voice across all 3 beats

---

## 5. Error Handling & Cost

- [x] Handle API errors (network failures, invalid key, bad request)
- [x] Handle rate limit errors with basic retry or backoff
- [x] Learn how to read token usage from API response (`usage` field)
- [x] Understand cost estimation (prompt tokens vs completion tokens)

---

## 6. Success Criteria

- [x] Gets OpenAI API key successfully
- [x] Makes first successful API call
- [x] Understands Chat Completions API
- [x] Creates meta directives config
- [x] Creates style guide config
- [x] Injects always-loaded layer into system prompt
- [x] Generates consistent narrative beats across runs
- [x] Handles API errors properly
- [x] Understands token usage and costs
- [x] Knows message role structure
