# User Stories

Narrative Engine — full-stack app (NestJS backend, Next.js frontend).

Roles: **Guest** (unauthenticated), **USER**, **ADMIN**.

---

## Guest (unauthenticated)

### US-G01 — Login form renders
As a Guest, I want to visit `/login` and see a sign-in form so that I can authenticate.

**Acceptance criteria**
- Email input, password input, and "Sign In" button are all visible on load
- No error message is shown on initial render
- Both inputs carry the `required` attribute

---

### US-G02 — USER login succeeds
As a Guest, I want to submit valid USER credentials so that I land on the narrative page.

**Acceptance criteria**
- `POST /api/auth/login` returns 200 with `{ accessToken }`
- `localStorage.accessToken` is set to the returned JWT
- Router navigates to `/narrative`
- The narrative auto-stream begins immediately on landing

---

### US-G03 — ADMIN login succeeds
As a Guest, I want to submit valid ADMIN credentials so that I land on the admin page.

**Acceptance criteria**
- `POST /api/auth/login` returns 200 with `{ accessToken }`
- JWT payload contains `role: "ADMIN"`
- `localStorage.accessToken` is set
- Router navigates to `/admin`

---

### US-G04 — Invalid credentials show error
As a Guest, I want to see an error message when I enter wrong credentials so that I know to retry.

**Acceptance criteria**
- `/api/auth/login` returns 401
- `<p role="alert">Invalid email or password</p>` is rendered
- No navigation occurs; URL remains `/login`
- `localStorage.accessToken` is not set

---

### US-G05 — Empty fields blocked by HTML5 validation
As a Guest, I want the form to block submission when fields are empty so that junk requests are not sent to the API.

**Acceptance criteria**
- Clicking "Sign In" with empty email/password does not fire a fetch request
- Browser native validation activates on the empty required input

---

### US-G06 — Unauthenticated access to `/narrative` redirects
As a Guest, I want to be redirected away from `/narrative` so that I cannot view private content without a token.

**Acceptance criteria**
- Visiting `/narrative` with no `localStorage.accessToken` triggers `router.push('/login')`
- Final URL is `/login`
- No stream request is fired before the redirect

---

### US-G07 — Root `/` redirects unauthenticated users to `/login`
As a Guest, I want visiting `/` to eventually land me on `/login` so that I am not stuck on a blank page.

**Acceptance criteria**
- `GET /` hits the Next.js root redirect → `/narrative` → `useAuthGuard()` → `/login`
- Final URL ends with `/login`

---

### US-G08 — Malformed token with required role is rejected
As a Guest with a corrupt token in localStorage, I want the auth guard to redirect me to `/login` so that the app does not crash or show partial content.

**Acceptance criteria**
- Setting `localStorage.accessToken = 'garbage'` and visiting a page that calls `useAuthGuard('ADMIN')` results in navigation to `/login`
- No uncaught JavaScript error is thrown
- *(Note: the bare `useAuthGuard()` call with no `requiredRole` does not decode the token and will not redirect a corrupt token — this edge case is only covered when a role is required)*

---

## USER (authenticated, role = USER)

### US-U01 — Narrative page auto-starts the first beat
As a USER, I want the narrative page to automatically begin streaming the opening beat so that I do not need a manual trigger.

**Acceptance criteria**
- On mount, `POST /api/generate/stream` is called once with body `{ prompt: "I enter a cavern." }`
- Streamed text appears without any user action

---

### US-U02 — Streaming text appears progressively with a cursor
As a USER, I want to see narrative text arrive chunk by chunk so that the experience feels live.

**Acceptance criteria**
- Each `chunk` event appends to the visible narrative paragraph
- A pulsing cursor (`data-testid="cursor"`) is visible while the stream is in-flight
- The cursor is removed when the `done` event arrives

---

### US-U03 — Choice buttons appear after each beat
As a USER, I want to see 2–4 choice buttons after the narrative beat ends so that I can advance the story.

**Acceptance criteria**
- Choice buttons are absent before the `done` event
- After `done`, all `choices[].label` values render as clickable buttons
- Buttons are enabled at this point

---

### US-U04 — Clicking a choice advances the story
As a USER, I want to click a choice and see the next beat stream in so that the story continues.

**Acceptance criteria**
- Clicking a choice button fires `POST /api/generate/stream` with `{ prompt: <choice label> }`
- The previous beat moves into the history area
- The clicked choice label is highlighted in the previous beat (`data-testid="chosen-action"`)
- New narrative text streams in for the next beat

---

### US-U05 — Custom action is validated before streaming
As a USER, I want to type a custom action and have it validated before the story continues so that the world rules are enforced.

**Acceptance criteria**
- Submitting text fires `POST /api/generate` (validation) first
- If validation accepts, `POST /api/generate/stream` fires with the same prompt
- `data-status="accepted"` is shown on the feedback indicator

---

### US-U06 — Validation spinner is shown while checking
As a USER, I want to see "Checking…" while my action is being validated so that I know the system is working.

**Acceptance criteria**
- Submit button shows "Checking…" and is `:disabled` while `/api/generate` is in-flight
- Input field is also `:disabled` during this window
- Button returns to "Submit" and re-enables once validation resolves

---

### US-U07 — Rejected action blocks the story with a reason
As a USER, I want rejected actions to be blocked with a clear explanation so that I understand what is not allowed.

**Acceptance criteria**
- `/api/generate` returns `{ rejected: true, reason: "..." }`
- `data-status="rejected"` is shown on the feedback indicator with the reason text
- No SSE stream is opened
- Input and Submit are re-enabled so the user can retry

---

### US-U08 — Input and submit are disabled during streaming
As a USER, I want the input and submit button locked while the story is streaming so that I cannot double-submit.

**Acceptance criteria**
- While a stream is in-flight, the text input is `:disabled` and the submit button is `:disabled`
- Both re-enable once the stream completes

---

### US-U09 — Stale choices are cleared when the next beat starts
As a USER, I want old choices to disappear when the next stream begins so that I cannot click a stale option.

**Acceptance criteria**
- When a new stream starts (via choice click or custom action), the existing choice buttons are removed
- They reappear only after the new `done` event with new choices

---

### US-U10 — Previous beats are preserved in history
As a USER, I want to see all previous beats below the current one so that I can follow the story so far.

**Acceptance criteria**
- After N beats, the BeatHistory section shows N entries in chronological order
- Older beats remain visible while a new beat streams in

---

### US-U11 — Server error shows a Retry button
As a USER, when the server emits an error event, I want a Retry button so that I can recover without reloading the page.

**Acceptance criteria**
- An SSE event `{ type: 'error', message }` renders an error banner and a Retry button
- Clicking Retry fires `POST /api/generate/stream` again with the last prompt
- On a successful retry, the error banner disappears and streaming resumes

---

### US-U12 — Network abort shows a Retry button
As a USER, when my connection drops mid-stream, I want a Retry button so that I can resume.

**Acceptance criteria**
- An aborted fetch produces the same error banner and Retry button as a server error
- Retry fires the stream request again and resumes normally on success

---

### US-U13 — Enter key submits the action
As a USER, I want to press Enter in the input field to submit my action so that I have keyboard ergonomics.

**Acceptance criteria**
- Pressing Enter with a non-empty value triggers the same submit flow as clicking the button
- Pressing Enter with an empty value does nothing

---

### US-U14 — Whitespace-only input is ignored; input clears after submit
As a USER, I want whitespace-only input to be rejected silently and the input to clear after a real submit so that the form behaves cleanly.

**Acceptance criteria**
- Submitting `"   "` does not fire any fetch request
- After a successful submission, the input value is `""`

---

### US-U15 — USER cannot access admin endpoint
As a USER, I want the admin stats endpoint to reject my token so that I cannot escalate my access.

**Acceptance criteria**
- `GET /api/admin/stats` with a USER JWT returns 403 Forbidden

---

### US-U16 — Rate limiter blocks excessive requests
As a USER repeatedly submitting, I want the throttler to return 429 after 5 requests per minute so that the server is protected from abuse.

**Acceptance criteria**
- The first 5 calls to `POST /api/generate` within 60 seconds return 200
- The 6th call within the same window returns 429
- The frontend does not crash on receiving a 429

---

### US-U17 — No stream fires before auth redirect
As a USER not yet authenticated, I want no stream request to be made before the auth guard redirects me so that private requests are never sent unauthenticated.

**Acceptance criteria**
- Without `localStorage.accessToken`, visiting `/narrative` triggers a redirect to `/login`
- No `POST /api/generate/stream` request is made before the redirect

---

## ADMIN (authenticated, role = ADMIN)

### US-A01 — ADMIN login routes to `/admin`
As an ADMIN, I want to be sent to the admin area after login so that I can access admin tooling.

**Acceptance criteria**
- After logging in with ADMIN credentials, `window.location.pathname` is `/admin`
- `localStorage.accessToken` contains a JWT with `role: "ADMIN"`
- *(Known gap: `client/app/admin/page.tsx` does not exist yet; this story tests the routing intent only)*

---

### US-A02 — ADMIN can read system stats
As an ADMIN, I want to fetch real-time system stats so that I can monitor the platform health.

**Acceptance criteria**
- `GET /api/admin/stats` with a valid ADMIN JWT returns 200 and a body with keys `entityCount`, `edgeCount`, `sessionCount`, `historyCount`, `latestHistoryAt`
- Without a token, the endpoint returns 401
- With a USER token, the endpoint returns 403

---

### US-A03 — ADMIN can also use the narrative page
As an ADMIN, I want to be able to visit `/narrative` so that I can verify the player experience.

**Acceptance criteria**
- With an ADMIN JWT in localStorage, navigating to `/narrative` is allowed (the page guard does not enforce a role)
- The auto-stream fires and the narrative panel is visible

---

### US-A04 — ADMIN can read the update spec
As an ADMIN, I want to fetch the current update spec so that I can review the generation rules.

**Acceptance criteria**
- `GET /api/config/update-spec` returns 200 with the current spec JSON
- The response body is valid JSON with the expected top-level structure

---

### US-A05 — ADMIN can update the update spec
As an ADMIN, I want to submit a new update spec so that I can change how the engine processes world mutations.

**Acceptance criteria**
- `PUT /api/config/update-spec` with a new JSON body returns 200
- A subsequent `GET /api/config/update-spec` reflects the change

---

### US-A06 — ADMIN can export a session
As an ADMIN, I want to retrieve a full session with its history so that I can audit what happened during a playthrough.

**Acceptance criteria**
- `GET /api/session/:id/export` returns 200 with the session metadata and an array of history entries for a valid session ID
- An invalid session ID returns a documented error shape
- *(Known gap: the generate endpoint does not currently return `sessionId` in its response, making it difficult to retrieve a session ID from a fresh generation within a test)*

---

### US-A07 — ADMIN can upload lore files
As an ADMIN, I want to upload a `.txt` lore file so that I can expand the world graph.

**Acceptance criteria**
- `POST /api/upload` with a multipart `.txt` file returns 200 and a body containing `entityCount` and `edgeCount` (numbers ≥ 0)
- An unsupported file type is rejected with an appropriate error response

---

## Known Gaps

| Gap | Affected Stories | Recommendation |
|-----|-----------------|----------------|
| No `client/app/admin/page.tsx` | US-A01 | Create the page; expand US-A01 acceptance criteria once it renders stats |
| Generate endpoint does not return `sessionId` | US-A06 | Add `sessionId` to the generate response |
| `modified` validation status is never set in UI | US-U05 | Either wire `modified` in the page or remove the branch from `ValidationFeedback` |
| `useAuthGuard()` without `requiredRole` does not decode the token | US-G08 | Document as intentional convenience guard; real security is backend JWT verification |
| Rate-limit bucket is global | US-U16 | Isolate the rate-limit test to a separate CI job with a fresh server start |
