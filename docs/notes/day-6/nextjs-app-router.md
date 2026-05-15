# Next.js App Router

## Folder Structure

`app/` is file-system routing. A folder = a URL segment. A route is only publicly accessible when `page.tsx` exists in that folder — colocated components/utils are invisible to the router.

**Special file conventions:**

| File | Role |
|---|---|
| `layout.tsx` | Persistent wrapper — does NOT remount on navigation. Root layout (`app/layout.tsx`) is required; must render `<html>` + `<body>`. |
| `page.tsx` | The unique UI for a segment. Makes the route public. |
| `loading.tsx` | Auto-wraps `page.tsx` in `<Suspense>`. Fallback shown instantly on navigation while page fetches. |
| `error.tsx` | Error boundary for the segment. **Must be `'use client'`**. Catches page + children, not same-level layout. |
| `template.tsx` | Like layout but remounts on every navigation — for per-route animations or `useEffect`. |
| `route.ts` | API endpoint (no JSX). Can coexist with `page.tsx` if exporting different HTTP verbs. |
| `not-found.tsx` | Triggered by calling `notFound()`. |

**Render hierarchy (outer → inner):**
`layout` → `template` → `error` → `loading` → `not-found` → `page`

**Private folders:** prefix with `_` (e.g., `_components/`) — excluded from routing entirely.

---

## Server vs Client Components

**Default:** every file in `app/` is a Server Component.

### Server Components — can / cannot

| Can | Cannot |
|---|---|
| `async/await` at top level | `useState`, `useReducer`, `useEffect`, `useRef` |
| DB queries, ORM calls, `process.env` secrets | Event handlers (`onClick`, `onChange`) |
| Filesystem access, any Node.js API | Browser APIs (`window`, `document`, `localStorage`) |
| Reduce client JS bundle | React Context (as provider or consumer) |

### Client Components — `'use client'`

Add `'use client'` as the **first line** of the file (above imports). This marks a **module graph boundary** — every import in that file is pulled into the client bundle. Only mark the entry point of the client subtree; children don't need the directive.

### Composition pattern — passing Server Components as children

Server Components **cannot** be imported into Client Components. But they **can** be passed as `children` or props:

```tsx
// page.tsx (Server Component)
import Modal from './modal'   // 'use client'
import Cart from './cart'     // Server Component

export default function Page() {
  return <Modal><Cart /></Modal>  // Cart renders on server, passed as prop
}
```

`<Cart>` renders on server; its RSC payload passes into the Client Component as a prop slot.

### Third-party components lacking `'use client'`

Wrap them:
```tsx
'use client'
export { Carousel } from 'acme-carousel'
```

### Preventing poisoning

- `server-only` npm package: import it in any file with secrets → build error if ever imported from a Client Component.
- `client-only` package: counterpart for browser-only modules.

**Props to Client Components must be serializable** (no functions, class instances).

---

## Routing

### Dynamic segments

```
[id]         → /posts/123         → params.id = '123'
[...slug]    → /docs/a/b/c       → params.slug = ['a','b','c']
[[...slug]]  → /docs or /docs/a  → optional catch-all
```

`params` is a **Promise** in Next.js 15+ — must be `await`ed:
```tsx
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```

### Route groups `(group)`

Parens = excluded from URL. Used to share layouts across a subset of routes without affecting path, or to create multiple root layouts.

### Parallel routes `@slot`

Named slots rendered by a parent layout into separate regions — each with its own `loading.tsx`, `error.tsx`, independent navigation state.

---

## Data Fetching

`getServerSideProps`, `getStaticProps`, `getInitialProps` — **all gone**. Data fetches are co-located in components.

### Async Server Component (primary pattern)

```tsx
export default async function Page() {
  const res = await fetch('https://api.example.com/posts')
  const posts = await res.json()
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}
```

### `fetch` cache options

| Option | Behavior |
|---|---|
| default | Dev: per-request. Build: statically prerendered once. |
| `{ cache: 'no-store' }` | Always fetch fresh, forces dynamic. |
| `{ cache: 'force-cache' }` | Persistent cache; updates on miss/stale. |
| `{ next: { revalidate: 60 } }` | Cache 60s then revalidate (ISR-style). |
| `{ next: { tags: ['posts'] } }` | Tag for on-demand invalidation via `revalidateTag`. |

**Memoization:** identical `GET fetch(url)` calls in the same render pass are deduplicated — executed once, result shared. Scope: per-request, not global.

### Parallel fetching

```tsx
// Sequential (bad — each await blocks the next):
const artist = await getArtist(id)
const albums = await getAlbums(id)

// Parallel (correct):
const [artist, albums] = await Promise.all([getArtist(id), getAlbums(id)])
```

---

## Calling an External NestJS API

### Pattern 1 — Fetch in Server Component (simplest)

```tsx
export default async function Page({ params }) {
  const { id } = await params
  const res = await fetch(`http://localhost:3001/story/${id}`, {
    headers: { Authorization: `Bearer ${process.env.NEST_API_KEY}` },
    cache: 'no-store',
  })
  const story = await res.json()
  return <div>{story.content}</div>
}
```

API key never reaches the client. Never use `NEXT_PUBLIC_` for secrets.

### Pattern 2 — Route Handler as proxy (for client-side calls)

```ts
// app/api/story/[id]/route.ts
export async function GET(req: NextRequest, { params }) {
  const { id } = await params
  const res = await fetch(`http://localhost:3001/story/${id}`, {
    headers: { Authorization: `Bearer ${process.env.NEST_API_KEY}` },
  })
  return Response.json(await res.json())
}
```

### Pattern 3 — Server Action for mutations

```tsx
'use server'
export async function saveProgress(chapterId: string) {
  await fetch('http://localhost:3001/progress', {
    method: 'POST',
    body: JSON.stringify({ chapterId }),
    headers: { Authorization: `Bearer ${process.env.NEST_API_KEY}` },
  })
  revalidateTag('progress')
}
```

---

## Streaming UI in App Router

### Mental model

React streams HTML chunks aligned with `<Suspense>` boundaries. The **static shell** (everything outside Suspense) is sent immediately. As async components resolve, React streams their HTML + a tiny inline `<script>` that swaps the fallback — without waiting for JS hydration.

### `loading.tsx` — page-level streaming

Drop `loading.tsx` next to `page.tsx`. Next.js auto-wraps `page.tsx` in `<Suspense>` with it as fallback. Layout renders immediately; skeleton shown instantly; page content swapped in when ready.

### `<Suspense>` — granular streaming

```tsx
export default function Page() {
  return (
    <>
      <h1>Narrative</h1>                     {/* static shell */}
      <Suspense fallback={<SkeletonChapter />}>
        <ChapterContent />                   {/* streams independently */}
      </Suspense>
      <Suspense fallback={<SkeletonSidebar />}>
        <ReaderProgress />                   {/* streams independently */}
      </Suspense>
    </>
  )
}
```

Each `<Suspense>` is an independent streaming point — they don't block each other.

### `use(promise)` — pass unresolved promise from server to client

```tsx
// Server Component (page.tsx)
const storyPromise = getStory(id)  // don't await
return (
  <Suspense fallback={<Loading />}>
    <StoryClient storyPromise={storyPromise} />
  </Suspense>
)

// Client Component
'use client'
import { use } from 'react'
function StoryClient({ storyPromise }) {
  const story = use(storyPromise)  // suspends until resolved
  return <div>{story.text}</div>
}
```

### `loading.tsx` vs `<Suspense>`

| | `loading.tsx` | `<Suspense>` |
|---|---|---|
| Scope | Entire page | Any component subtree |
| Setup | Drop a file | Wrap explicitly |
| Best for | Simple page-level skeletons | Progressive reveal, narrative UI |

### Gotchas

- `notFound()` / `redirect()` with correct HTTP status must be called **before** any `await` or Suspense boundary — once streaming starts, `200 OK` is already sent.
- `min-height: 0` required on flex scroll containers (see scroll-to-bottom note).
- Nginx/CDN buffering kills streaming — set `X-Accel-Buffering: no`.
- Static export (`output: 'export'`) does not support streaming.
- Keep LCP element outside Suspense boundaries or it won't paint until resolved.
