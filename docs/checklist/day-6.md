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

> **TDD:** Use `/plan-cycle` before implementing. The narrative panel (renders text, is scrollable), streaming text display (appends chunks), and scroll-to-bottom behaviour are testable with React Testing Library.

- [x] Create narrative page in Next.js (`app/narrative/page.tsx` or similar)
- [x] Build narrative panel component — scrollable area displaying narrative text
- [x] Add streaming text display — chunks appended progressively as SSE events arrive
- [x] Add scroll-to-bottom behaviour on new narrative beats

---

## 3. Choice Buttons

> **TDD:** Use `/plan-cycle` before implementing. Choice buttons (renders correct labels, fires callback on click, clears on new beat) are testable with React Testing Library.

- [x] Display 2–4 dynamic choice buttons below the narrative panel
- [x] Choices populated from `{ type: 'choices', choices: [...] }` SSE event
- [x] Clicking a choice submits it as the next action prompt
- [x] Clear and re-render choices on each new narrative beat

---

## 4. Custom Action Input

- [x] Add custom action text input field below choice buttons
- [x] Submitting the input sends it as a free-text prompt to `/generate`
- [x] Show validation feedback inline (accepted / modified / rejected + reason)
- [x] Optimistic UI — show action immediately, rollback display on rejection

> **TDD:** Use `/plan-cycle` for the optimistic UI logic — `useOptimistic` rollback behaviour on rejection is testable in isolation.

---

## 5. Narrative History

- [x] Display previous narrative beats in a scrollable history above the current beat
- [x] Highlight the user's past chosen action for each beat
- [x] History persists across beats within the session

> **TDD:** Use `/plan-cycle` for `useNarrativeHistory` hook — appending beats, tracking chosen actions, and pagination are unit-testable state transitions.

---

## 6. Streaming Integration

> **TDD:** Use `/plan-cycle` before implementing. The `useStream` hook (SSE fetch → buffer → parse → dispatch events) and the SSE event parser utility are the core testable units. Test each event type (`start`, `chunk`, `done`, `choices`, `error`) in isolation with a mocked `ReadableStream`.

- [x] Connect frontend to the `GET /generate/stream` SSE endpoint
- [x] Handle `{ type: 'start' }` — show typing indicator
- [x] Handle `{ type: 'chunk', content }` — append text progressively
- [x] Handle `{ type: 'done' }` — hide typing indicator
- [x] Handle `{ type: 'choices', choices }` — render choice buttons
- [x] Handle `{ type: 'error', message }` — display error with retry option

---

## 7. Error Handling & UX

- [x] Show error state with retry button when stream fails
- [x] Disable input and choices while stream is in progress
- [x] Handle network disconnect gracefully

> **TDD:** Use `/plan-cycle` for the `useStream` error path — abort on unmount and error event emission are testable without a real network.

---

## 8. Success Criteria

- [x] Narrative page created in Next.js
- [x] Narrative panel displays streaming text chunk by chunk
- [x] 2–4 dynamic choice buttons rendered from API response
- [x] Custom action input field submits free-text prompts
- [x] Validation feedback shown inline (accepted/modified/rejected)
- [x] Narrative history scrollback renders previous beats
- [x] Streaming endpoint connected and working end-to-end
- [x] Errors handled with retry mechanism
- [x] Smooth choice → narrative → choice loop
- [x] UI works end-to-end with the running backend
