# Error Handling and Rate Limits

## Common OpenAI API Errors

### HTTP 401 — Unauthorized
Your API key is missing, invalid, or revoked.

```json
{
  "error": {
    "message": "Incorrect API key provided: sk-abc***",
    "type": "invalid_request_error",
    "code": "invalid_api_key"
  }
}
```

**Causes:**
- API key not set or has a typo
- Key was deleted or rotated on the dashboard
- Using a key from the wrong organization

**Fix:**
- Verify `process.env.OPENAI_API_KEY` is set
- Check the key on [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

### HTTP 429 — Too Many Requests (Rate Limited)
You've exceeded your rate limits.

```json
{
  "error": {
    "message": "Rate limit reached for gpt-4o-mini in organization org-xxx",
    "type": "requests",
    "code": "rate_limit_exceeded"
  }
}
```

**Fix:** Back off and retry. See the retry strategy section below.

---

### HTTP 500 — Internal Server Error
OpenAI's servers encountered an unexpected error.

**Fix:** Retry after a short delay. If persistent, check [status.openai.com](https://status.openai.com).

---

### HTTP 503 — Service Unavailable
The API is overloaded or temporarily down.

**Fix:** Same as 500 — retry with backoff, check status page.

---

### HTTP 400 — Bad Request
Your request is malformed.

**Common causes:**
- `max_tokens` exceeds the model's context window
- Invalid `model` value
- Malformed `messages` array
- `temperature` outside the valid range

**Fix:** Inspect the error message — it usually names the offending field.

---

## Rate Limits

OpenAI enforces two types of rate limits:

| Limit Type | What It Tracks | Typical Unit |
|---|---|---|
| **RPM** (Requests Per Minute) | Number of API calls | e.g., 500 RPM |
| **TPM** (Tokens Per Minute) | Total tokens across all calls | e.g., 200,000 TPM |

**Limits vary by:**
- Model (GPT-4o has lower limits than GPT-4o-mini)
- Usage tier (higher tiers unlock higher limits)
- Organization type (free vs. paid)

**Check your limits:** Platform → Settings → Limits

**Rate limit headers** are returned in every response:
```
x-ratelimit-limit-requests: 500
x-ratelimit-limit-tokens: 200000
x-ratelimit-remaining-requests: 499
x-ratelimit-remaining-tokens: 199650
x-ratelimit-reset-requests: 2024-01-01T00:00:01Z
x-ratelimit-reset-tokens: 2024-01-01T00:00:00.350Z
```

---

## Retry Strategy: Exponential Backoff

When you hit a `429` or `5xx`, wait and retry. Use exponential backoff so you don't hammer the API.

**Formula:** `wait = baseDelay * 2^attempt + jitter`

### TypeScript Implementation

```typescript
import OpenAI from "openai";

const client = new OpenAI();

interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 4,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
  } = options;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRetryable = isRetryableError(error);
      const isLastAttempt = attempt === maxAttempts - 1;

      if (!isRetryable || isLastAttempt) {
        throw error;
      }

      // Exponential backoff with jitter
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * 1000;
      const delay = Math.min(exponentialDelay + jitter, maxDelayMs);

      console.warn(
        `Attempt ${attempt + 1} failed. Retrying in ${Math.round(delay)}ms...`
      );
      await sleep(delay);
    }
  }

  throw new Error("Should not reach here");
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    // Retry on rate limits and server errors
    return error.status === 429 || error.status >= 500;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

---

## Comprehensive Error Handling with try/catch

```typescript
import OpenAI from "openai";

const client = new OpenAI();

async function safeCompletion(userMessage: string): Promise<string | null> {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: userMessage }],
      max_tokens: 500,
    });

    return response.choices[0].message.content;

  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      handleAPIError(error);
    } else if (error instanceof Error) {
      console.error("Unexpected error:", error.message);
    } else {
      console.error("Unknown error:", error);
    }
    return null;
  }
}

function handleAPIError(error: OpenAI.APIError): void {
  switch (error.status) {
    case 400:
      console.error("Bad request:", error.message);
      // Log and fix the request structure — do NOT retry
      break;

    case 401:
      console.error("Authentication failed. Check your API key.");
      // Fatal — do NOT retry
      break;

    case 403:
      console.error("Permission denied:", error.message);
      // Check your account permissions — do NOT retry
      break;

    case 429:
      console.warn("Rate limited. Should be retried with backoff.");
      // Retryable
      break;

    case 500:
    case 502:
    case 503:
      console.warn("OpenAI server error. Should be retried.");
      // Retryable
      break;

    default:
      console.error(`Unhandled API error ${error.status}:`, error.message);
  }
}
```

---

## Full Pattern: Retry + Error Handling Together

```typescript
import OpenAI from "openai";

const client = new OpenAI();

async function callWithRetry(userMessage: string): Promise<string> {
  return withRetry(
    async () => {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: userMessage }],
        max_tokens: 300,
      });
      return response.choices[0].message.content ?? "";
    },
    { maxAttempts: 4, baseDelayMs: 1000, maxDelayMs: 16000 }
  );
}

// Usage
async function main() {
  try {
    const result = await callWithRetry("Summarize the history of the printing press in 3 sentences.");
    console.log(result);
  } catch (error) {
    if (error instanceof OpenAI.APIError && error.status === 401) {
      console.error("Fatal: invalid API key. Exiting.");
      process.exit(1);
    }
    console.error("All retries exhausted:", error);
  }
}

main();
```

---

## OpenAI SDK Error Types

The `openai` npm package exports typed error classes:

| Error Class | When It's Thrown |
|---|---|
| `OpenAI.APIError` | Base class for all API errors (has `.status`, `.message`, `.code`) |
| `OpenAI.AuthenticationError` | 401 — invalid or missing API key |
| `OpenAI.PermissionDeniedError` | 403 — access denied |
| `OpenAI.NotFoundError` | 404 — model or resource not found |
| `OpenAI.RateLimitError` | 429 — rate limit exceeded |
| `OpenAI.BadRequestError` | 400 — malformed request |
| `OpenAI.InternalServerError` | 500 — OpenAI server error |
| `OpenAI.APIConnectionError` | Network-level failure (DNS, timeout) |

```typescript
import OpenAI from "openai";

try {
  // ...
} catch (error) {
  if (error instanceof OpenAI.RateLimitError) {
    // Handle 429 specifically
  } else if (error instanceof OpenAI.AuthenticationError) {
    // Handle 401 specifically
  } else if (error instanceof OpenAI.APIConnectionError) {
    // Handle network errors
  }
}
```

---

## Quick Reference: Error Decision Tree

```
Error received
  └── Is it OpenAI.APIError?
        ├── status 400  → Fix request, do NOT retry
        ├── status 401  → Fix API key, do NOT retry
        ├── status 429  → Retry with exponential backoff
        ├── status 5xx  → Retry with exponential backoff
        └── Other       → Log and escalate
  └── Is it OpenAI.APIConnectionError?
        └── Retry — likely a transient network issue
  └── Unknown error
        └── Log, escalate, do not retry blindly
```
