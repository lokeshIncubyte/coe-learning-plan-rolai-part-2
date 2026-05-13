# Day 1 Checklist — OpenAI API Basics + Narrative Generator Foundation

**Project focus:** AI Chat Assistant + Progressive Gen (narrative generator core)

---

## Setup

- [ ] Get OpenAI API key from platform.openai.com
- [ ] Store API key in `.env` file (`OPENAI_API_KEY=...`)
- [ ] Install OpenAI SDK (`npm install openai` or equivalent)
- [ ] Verify environment loads the key correctly

---

## Core Learning

- [ ] Learn OpenAI API fundamentals and authentication flow
- [ ] Make first successful API call to Chat Completions endpoint
- [ ] Experiment with `temperature` parameter (0 vs 0.7 vs 1.0)
- [ ] Experiment with `max_tokens` parameter
- [ ] Understand the `messages` array structure
- [ ] Understand `system`, `user`, and `assistant` message roles

---

## Config Files

- [ ] Create a Meta Directives config file (theme, core principles, world rules)
- [ ] Create a Style Guide config file (voice, tone, format rules)
- [ ] Ensure both config files are importable/readable at runtime

---

## Narrative Generator

- [ ] Build a simple narrative generator script in TypeScript
- [ ] Inject meta directives config into the system prompt
- [ ] Inject style guide config into the system prompt
- [ ] Generate 3 story beats in a single run
- [ ] Verify consistent theme and voice across all 3 beats

---

## Error Handling & Cost

- [ ] Handle API errors (network failures, invalid key, bad request)
- [ ] Handle rate limit errors with basic retry or backoff
- [ ] Learn how to read token usage from API response (`usage` field)
- [ ] Understand cost estimation (prompt tokens vs completion tokens)

---

## Success Criteria

- [ ] Gets OpenAI API key successfully
- [ ] Makes first successful API call
- [ ] Understands Chat Completions API
- [ ] Creates meta directives config
- [ ] Creates style guide config
- [ ] Injects always-loaded layer into system prompt
- [ ] Generates consistent narrative beats across runs
- [ ] Handles API errors properly
- [ ] Understands token usage and costs
- [ ] Knows message role structure
