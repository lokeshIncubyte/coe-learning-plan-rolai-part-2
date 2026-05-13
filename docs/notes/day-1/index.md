# Day 1 Notes — OpenAI API Basics + Narrative Generator Foundation

## Overview

Day 1 covers the foundational skills for working with the OpenAI API and building a config-driven narrative generator in TypeScript. Topics range from authentication and first API calls through to token cost management and production-grade error handling.

---

## Note Files

| File | Topic | Description |
|---|---|---|
| [01-openai-api-overview.md](./01-openai-api-overview.md) | API Overview | What the OpenAI API is, authentication with API keys, the base URL, the Chat Completions endpoint, and a minimal curl + TypeScript first call |
| [02-chat-completions-parameters.md](./02-chat-completions-parameters.md) | Request Parameters | Deep dive into `model`, `messages`, `temperature`, `max_tokens`, `top_p`, `frequency_penalty`, `presence_penalty`, `stop`, `n`, and `stream` with a full TypeScript example |
| [03-message-roles.md](./03-message-roles.md) | Message Roles | How `system`, `user`, and `assistant` roles work, how the conversation array is structured, multi-turn history management, and how system prompts shape model behavior |
| [04-meta-directives-and-style-config.md](./04-meta-directives-and-style-config.md) | Meta Directives & Style Config | What meta directives are (theme, principles, persistent instructions), what a style guide config is (voice, tone, format rules), TypeScript config objects for both, and how to inject them into the system prompt |
| [05-narrative-generator.md](./05-narrative-generator.md) | Narrative Generator | Building a modular narrative generator in TypeScript — project structure, config injection, generating 3 story beats via chained API calls with conversation context |
| [06-tokens-and-cost-management.md](./06-tokens-and-cost-management.md) | Tokens & Cost | What tokens are, how to count them with `tiktoken`, pricing for common models (gpt-4o, gpt-4o-mini), cost estimation functions, and cumulative usage tracking |
| [07-error-handling-and-rate-limits.md](./07-error-handling-and-rate-limits.md) | Error Handling & Rate Limits | Common errors (401, 429, 500), rate limits (RPM/TPM), exponential backoff retry strategy, typed OpenAI SDK error classes, and a full error handling pattern |

---

## Key Concepts at a Glance

- **Authentication:** API key as Bearer token; always use environment variables
- **Core endpoint:** `POST /v1/chat/completions`
- **Temperature:** `0.0` = deterministic, `1.0` = balanced, `2.0` = very random
- **Message roles:** `system` (instructions) → `user` (input) → `assistant` (history)
- **Meta directives:** Persistent world + identity config injected into the system prompt
- **Style config:** Voice, tone, format rules injected into the system prompt
- **Token cost:** Billed on input + output tokens; `gpt-4o-mini` is ~17x cheaper than `gpt-4o`
- **Retryable errors:** 429 and 5xx — use exponential backoff
- **Non-retryable errors:** 400 and 401 — fix the request or credentials

---

## Suggested Reading Order

1. Start with `01` to understand what the API is and make your first call
2. Read `02` to understand how to tune request parameters
3. Read `03` to understand message structure and multi-turn conversations
4. Read `04` to understand how to build config objects for a production AI app
5. Read `05` to see how everything comes together in a working narrative generator
6. Read `06` to understand token costs and how to track them
7. Read `07` last — critical for any production usage
