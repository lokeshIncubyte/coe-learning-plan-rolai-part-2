# Message Roles in Chat Completions

## Overview

Every message in a Chat Completions request has a `role` field. The role tells the model who is speaking and how much authority that speaker has. The three core roles are:

- `system` — Sets context and behavior for the entire conversation
- `user` — The human's input / the prompt
- `assistant` — The model's previous responses (used to build conversation history)

---

## The `system` Role

The system message is the **most powerful** slot. It runs before the conversation and shapes how the model behaves throughout the entire session.

**What to put in a system message:**
- The model's persona or identity
- Behavioral constraints ("always respond in JSON", "never break character")
- Background context the model needs before it can help
- Tone and style instructions

**Key traits:**
- There should typically be **one** system message, placed first in the array
- It is not visible to users in a chat UI — it is a hidden instruction layer
- It has higher influence over behavior than user messages

**Example:**
```typescript
{
  role: "system",
  content: `You are a senior TypeScript engineer at a startup.
You give concise, practical answers.
You always provide code examples.
You never use jargon without explaining it.`
}
```

---

## The `user` Role

The user message represents input from the human. This is the "question" or "task" side of the conversation.

**Characteristics:**
- Can appear multiple times (once per turn)
- The most recent user message is the active prompt the model responds to
- Can contain instructions, questions, data, or raw text to process

**Example:**
```typescript
{ role: "user", content: "Explain closures in JavaScript." }
```

---

## The `assistant` Role

The assistant message represents the model's **prior responses**. You include these when building multi-turn conversations so the model knows what it previously said.

**Characteristics:**
- You write these yourself when replaying history — the API does not remember previous calls
- The API is stateless; you must reconstruct the conversation on every request
- Can be used to "prime" the model by pre-filling its first response (advanced)

**Example — continuing a conversation:**
```typescript
{ role: "assistant", content: "A closure is a function that captures variables from its surrounding scope." }
```

---

## How the Conversation Array Is Structured

Messages are ordered chronologically. A typical multi-turn conversation looks like:

```typescript
const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
  // 1. System context (first, always)
  {
    role: "system",
    content: "You are a helpful programming tutor. Be encouraging and clear.",
  },

  // 2. First user turn
  {
    role: "user",
    content: "What is a promise in JavaScript?",
  },

  // 3. Model's previous response (assistant turn)
  {
    role: "assistant",
    content: "A Promise is an object representing the eventual completion or failure of an async operation.",
  },

  // 4. Next user turn (the active prompt)
  {
    role: "user",
    content: "Can you show me a simple example?",
  },
];
```

The model reads all messages in order and generates a reply to the final user message, taking everything before it as context.

---

## Full TypeScript Example — Multi-Turn Conversation

```typescript
import OpenAI from "openai";

const client = new OpenAI();

type Message = OpenAI.Chat.ChatCompletionMessageParam;

async function chat(history: Message[], userMessage: string): Promise<string> {
  const messages: Message[] = [
    ...history,
    { role: "user", content: userMessage },
  ];

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
  });

  return response.choices[0].message.content ?? "";
}

async function main() {
  const systemMessage: Message = {
    role: "system",
    content: "You are a knowledgeable history tutor. Keep answers under 3 sentences.",
  };

  // Turn 1
  const reply1 = await chat([systemMessage], "Who was Julius Caesar?");
  console.log("Turn 1:", reply1);

  // Turn 2 — include previous exchange in history
  const history: Message[] = [
    systemMessage,
    { role: "user", content: "Who was Julius Caesar?" },
    { role: "assistant", content: reply1 },
  ];

  const reply2 = await chat(history, "When was he assassinated?");
  console.log("Turn 2:", reply2);
}

main();
```

---

## How System Prompts Shape Model Behavior

The system message is your primary lever for controlling output quality and style.

**Persona definition:**
```typescript
content: "You are a dry, witty British critic reviewing restaurants."
```

**Output format enforcement:**
```typescript
content: "Always respond with valid JSON. Never include prose outside the JSON block."
```

**Constraint injection:**
```typescript
content: `You are a customer support agent for Acme Corp.
Rules:
- Never discuss competitor products
- Always end responses with "Is there anything else I can help you with?"
- If you don't know the answer, say "Let me check on that for you."`
```

**Knowledge grounding:**
```typescript
content: `You are analyzing the following dataset:
${JSON.stringify(data)}
Answer all questions based only on this data.`
```

---

## Role Summary

| Role | Who | Position | Frequency |
|---|---|---|---|
| `system` | Developer instructions | First message | Once (usually) |
| `user` | Human input | After system | One per turn |
| `assistant` | Model's prior replies | After each user turn | One per turn |
