---
id: cycle-061
slug: admin-page-config-editor-display
status: done
source: "Admin page: add config editor section that fetches /api/config/update-spec and displays spec in a read-only textarea"
covers: happy-path
group: admin-dashboard
---

## Dependencies
- `client/app/api/config/update-spec/route.ts` — must exist (cycle-057 GREEN)
- `client/app/admin/page.tsx` — already exists (cycle-054, updated in cycle-060)

## Behavior

Add a second `useState`/`useEffect` pair to `client/app/admin/page.tsx` that fetches `GET /api/config/update-spec` with the stored `Authorization` header on mount and stores the result as `spec`. Render a `<section>` with `<h2>Update Spec</h2>` and a `<textarea>` whose `value` is `JSON.stringify(spec, null, 2)` and `readOnly`. The save interaction is cycle-062. The mock for the test must distinguish the two fetch calls: the first call (to `/api/admin/stats`) returns stats, the second call (to `/api/config/update-spec`) returns the spec.

## RED
- **Test file**: `client/__tests__/app/admin/page.test.tsx`
- **Assertion** (add a new `describe` block after the existing `describe('AdminPage', ...)` block):
  ```ts
  describe('AdminPage — config editor', () => {
    beforeEach(() => {
      localStorage.setItem('accessToken', 'header.eyJyb2xlIjoiQURNSU4ifQ.sig')
    })

    afterEach(() => {
      localStorage.clear()
    })

    it('fetches spec from /api/config/update-spec and displays it in a textarea', async () => {
      const mockSpec = { version: 1, actions: ['jump', 'run'] }

      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/api/admin/stats')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              entityCount: 1, edgeCount: 0, sessionCount: 0, historyCount: 0, latestHistoryAt: null,
            }),
          } as any)
        }
        if (url.includes('/api/config/update-spec')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockSpec),
          } as any)
        }
        return Promise.reject(new Error(`Unexpected fetch: ${url}`))
      })

      render(<AdminPage />)

      await waitFor(() =>
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      )

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveValue(JSON.stringify(mockSpec, null, 2))
      expect(screen.getByText(/update spec/i)).toBeInTheDocument()
    })
  })
  ```
- **Why it fails**: `AdminPage` does not yet fetch `/api/config/update-spec` or render a `<textarea>`, so `screen.getByRole('textbox')` throws.

## GREEN
- **Smallest change**: In `client/app/admin/page.tsx`:
  1. Add `const [spec, setSpec] = useState<object | null>(null)` to the component state.
  2. Add a second `useEffect` (or extend the existing one) that fetches `/api/config/update-spec` with the same `Authorization: Bearer <token>` header on mount, calls `.then(r => r.json()).then(setSpec)`.
  3. After the existing stats grid (and after the Lore Upload section from cycle-060), add:
     ```tsx
     <section className="mt-8">
       <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Update Spec</h2>
       {spec && (
         <textarea
           className="w-full h-64 font-mono text-sm border rounded p-2"
           value={JSON.stringify(spec, null, 2)}
           readOnly
         />
       )}
     </section>
     ```
- **Files touched**: `client/app/admin/page.tsx`

## REFACTOR
none
