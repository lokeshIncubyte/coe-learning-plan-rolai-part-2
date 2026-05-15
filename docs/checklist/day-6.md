# Day 6 Checklist — Next.js Narrative UI with Choices

**Project focus:** Progressive Gen (choice-based narrative interface) + AI Chat Assistant (interactive chat UI)

---

## 1. Core Learning

- [x] Understand Next.js App Router — pages, layouts, server vs client components
- [x] Understand SSE client consumption — `EventSource` API, `fetch` with streaming response body
- [x] Understand optimistic UI updates — show narrative immediately, rollback on rejection
- [x] Understand scroll-to-bottom patterns for streaming text
- [x] Scaffold Next.js app (`client/`) with App Router, TypeScript, and Tailwind

---

## 2. Narrative Page Setup

- [ ] Create narrative page in Next.js (`app/narrative/page.tsx` or similar)
- [ ] Build narrative panel component — scrollable area displaying narrative text
- [ ] Add streaming text display — chunks appended progressively as SSE events arrive
- [ ] Add scroll-to-bottom behaviour on new narrative beats

---

## 3. Choice Buttons

- [ ] Display 2–4 dynamic choice buttons below the narrative panel
- [ ] Choices populated from `{ type: 'choices', choices: [...] }` SSE event
- [ ] Clicking a choice submits it as the next action prompt
- [ ] Clear and re-render choices on each new narrative beat

---

## 4. Custom Action Input

- [ ] Add custom action text input field below choice buttons
- [ ] Submitting the input sends it as a free-text prompt to `/generate`
- [ ] Show validation feedback inline (accepted / modified / rejected + reason)
- [ ] Optimistic UI — show action immediately, rollback display on rejection

> **TDD:** Use `/plan-cycle` for the optimistic UI logic — `useOptimistic` rollback behaviour on rejection is testable in isolation.

---

## 5. Narrative History

- [ ] Display previous narrative beats in a scrollable history above the current beat
- [ ] Highlight the user's past chosen action for each beat
- [ ] History persists across beats within the session

> **TDD:** Use `/plan-cycle` for `useNarrativeHistory` hook — appending beats, tracking chosen actions, and pagination are unit-testable state transitions.

---

## 6. Streaming Integration

> **TDD:** Use `/plan-cycle` before implementing. The `useStream` hook (SSE fetch → buffer → parse → dispatch events) and the SSE event parser utility are the core testable units. Test each event type (`start`, `chunk`, `done`, `choices`, `error`) in isolation with a mocked `ReadableStream`.

- [ ] Connect frontend to the `GET /generate/stream` SSE endpoint
- [ ] Handle `{ type: 'start' }` — show typing indicator
- [ ] Handle `{ type: 'chunk', content }` — append text progressively
- [ ] Handle `{ type: 'done' }` — hide typing indicator
- [ ] Handle `{ type: 'choices', choices }` — render choice buttons
- [ ] Handle `{ type: 'error', message }` — display error with retry option

---

## 7. Error Handling & UX

- [ ] Show error state with retry button when stream fails
- [ ] Disable input and choices while stream is in progress
- [ ] Handle network disconnect gracefully

> **TDD:** Use `/plan-cycle` for the `useStream` error path — abort on unmount and error event emission are testable without a real network.

---

## 8. Success Criteria

- [ ] Narrative page created in Next.js
- [ ] Narrative panel displays streaming text chunk by chunk
- [ ] 2–4 dynamic choice buttons rendered from API response
- [ ] Custom action input field submits free-text prompts
- [ ] Validation feedback shown inline (accepted/modified/rejected)
- [ ] Narrative history scrollback renders previous beats
- [ ] Streaming endpoint connected and working end-to-end
- [ ] Errors handled with retry mechanism
- [ ] Smooth choice → narrative → choice loop
- [ ] UI works end-to-end with the running backend
