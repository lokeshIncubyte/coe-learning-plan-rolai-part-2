# Optimistic UI in React 19

## Mental Model

Show the expected result of a mutation immediately, before the server confirms. If the server rejects or errors, roll back to the last confirmed state.

**The contract:**
- On success: server response replaces the optimistic state.
- On failure: UI silently reverts to the pre-action state.
- Optimistic values must never leak into persisted state — they exist only for the duration of the in-flight action.

---

## `useOptimistic` — React 19 Hook

```ts
const [optimisticState, setOptimistic] = useOptimistic(
  value,                                        // source-of-truth state
  reducer?: (currentState, action) => nextState // optional
)
```

**Parameters:**
- `value` — the real/confirmed state. When no action is pending, `optimisticState === value`.
- `reducer` (optional) — pure function `(currentState, payload) => nextState`. If omitted, `setOptimistic(x)` replaces the entire state with `x`. Use the reducer form when the base state can change concurrently (e.g., a list that refreshes from server while an action is in flight — React re-runs the reducer against the latest `value`).

**`setOptimistic` must be called inside `startTransition` or a form Action.** Cannot be called outside an action context or during render.

**Rollback is automatic** — no manual cleanup code needed. When the action completes (success or throw), React re-renders using the actual `value` prop. On error, you only need to catch the error to show a message; you do NOT need to call `setOptimistic` to revert.

**Reducer form for lists (concurrent-safe):**
```ts
const [optimisticActions, addOptimistic] = useOptimistic(
  actions,
  (current, newAction) => [
    ...current,
    { ...newAction, status: 'pending', id: crypto.randomUUID() }
  ]
)
```

---

## Manual Optimistic Pattern (React 18 / no hooks)

Use when: React 18 compatibility, class components, or mutation library (e.g., TanStack Query) manages its own cache.

```ts
const handleSubmit = async (userAction: string) => {
  const previousActions = actions              // 1. snapshot
  setActions(prev => [...prev, {               // 2. apply optimistically
    id: crypto.randomUUID(),
    text: userAction,
    status: 'pending'
  }])

  try {
    const result = await validateWithAI(userAction)
    setActions(prev => prev.map(a =>           // 3. apply server truth
      a.id === result.id
        ? { ...a, status: result.status }
        : a
    ))
  } catch (err) {
    setActions(previousActions)                // 4. rollback
    setError('Submission failed — please retry.')
  }
}
```

**Rules:**
- Always snapshot before any mutation.
- Use `crypto.randomUUID()` client-side so you can target the item in the list later.
- Rollback replaces state entirely with the snapshot.
- For partial failure (keep item visible with error badge): update `status: 'rejected'` in catch instead of reverting.

---

## `useTransition` + `startTransition`

```ts
const [isPending, startTransition] = useTransition()
```

Marks state updates as non-urgent ("Transitions") — React keeps the current UI interactive while the update processes. Since React 19, `startTransition` accepts async functions; `isPending` stays `true` for the full duration.

**Post-`await` caveat — critical:**
```ts
startTransition(async () => {
  await serverCall()
  // ❌ NOT a Transition — captured after await:
  setResult(data)

  // ✅ Must re-wrap:
  startTransition(() => setResult(data))
})
```

`isPending` drives: loading spinners, disabled buttons, placeholder states while the server action runs.

---

## `useActionState` — React 19

```ts
const [state, dispatchAction, isPending] = useActionState(
  reducerAction: (previousState: S, payload: P) => Promise<S> | S,
  initialState: S,
  permalink?: string
)
```

- `reducerAction` — async or sync. Return value becomes the new state. Side effects (API calls) are valid.
- `isPending` — true while action executes. No manual loading state needed.
- Actions **queue sequentially** — second call receives the first's return value as `previousState`. Eliminates race conditions.

**Error handling — return vs throw:**
```ts
async function validateAction(prevState, formData) {
  const result = await ai.validate(formData.get('action'))
  if (result.rejected) return { ...prevState, error: result.reason, status: 'rejected' }  // expected errors → return
  return { text: result.finalText, status: 'accepted', error: null }
  // throw new Error('Network error')  // unexpected errors → Error Boundary
}
```

---

## Combining `useActionState` + `useOptimistic`

```ts
const [confirmedState, dispatchAction, isPending] = useActionState(validateAction, initialState)
const [optimisticState, setOptimistic] = useOptimistic(
  confirmedState,
  (current, userText) => ({ ...current, text: userText, status: 'pending' })
)

function handleSubmit(text: string) {
  startTransition(() => {
    setOptimistic(text)    // immediate: show item as "pending"
    dispatchAction(text)   // queued: server validates, updates confirmedState
  })
}
```

---

## Per-Item Status Rendering

Each item in the list carries `status: 'pending' | 'accepted' | 'modified' | 'rejected'`.

```ts
type ActionItem = {
  id: string
  text: string
  status: 'pending' | 'accepted' | 'modified' | 'rejected'
  error?: string
}
```

```tsx
function ActionItem({ item }: { item: ActionItem }) {
  return (
    <li style={{
      opacity: item.status === 'pending' ? 0.5 : 1,
      color: item.status === 'rejected' ? 'red'
           : item.status === 'modified' ? 'orange'
           : 'inherit'
    }}>
      {item.text}
      {item.status === 'pending' && <span> (validating...)</span>}
      {item.status === 'rejected' && <span> ✗ {item.error}</span>}
      {item.status === 'modified' && <span> (modified by AI)</span>}
    </li>
  )
}
```

**Three strategies:**

| Strategy | When |
|---|---|
| Full rollback — item disappears | Simple cases |
| Keep item with `status: 'rejected'` + retry | Better UX — user can re-examine |
| Replace text with AI-modified version + diff indicator | When AI modification must be visible |

**Key IDs rule:** generate `crypto.randomUUID()` client-side for the optimistic item. On success, replace the temp ID with the real DB id. Keep the temp ID as the React `key` through the confirmation for in-place animation; swap it if you want unmount/remount.

---

## Quick Reference

| Hook | Returns | Rollback |
|---|---|---|
| `useOptimistic(value, reducer?)` | `[optimisticState, setOptimistic]` | Automatic on action end |
| `useTransition()` | `[isPending, startTransition]` | n/a (UI responsiveness) |
| `useActionState(fn, init)` | `[state, dispatch, isPending]` | Return error state; throw → Error Boundary |
