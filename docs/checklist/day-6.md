# Day 6 Checklist — Next.js Narrative UI with Choices

**Project focus:** Progressive Gen (choice-based narrative interface) + AI Chat Assistant (interactive chat UI)

---

## 1. Core Learning

- [ ] Understand Next.js App Router — pages, layouts, server vs client components
- [ ] Understand SSE client consumption — `EventSource` API, `fetch` with streaming response body
- [ ] Understand optimistic UI updates — show narrative immediately, rollback on rejection
- [ ] Understand scroll-to-bottom patterns for streaming text

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

---

## 5. Narrative History

- [ ] Display previous narrative beats in a scrollable history above the current beat
- [ ] Highlight the user's past chosen action for each beat
- [ ] History persists across beats within the session

---

## 6. Streaming Integration

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
