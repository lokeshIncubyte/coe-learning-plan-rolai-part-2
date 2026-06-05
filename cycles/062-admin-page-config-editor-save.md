---
id: cycle-062
slug: admin-page-config-editor-save
status: done
source: "Admin page: make config editor textarea editable and add Save Spec button that PUTs the edited JSON"
covers: happy-path
group: admin-dashboard
---

## Dependencies
- `client/app/api/config/update-spec/route.ts` — PUT handler must exist (cycle-058 GREEN)
- `client/app/admin/page.tsx` — spec fetch + read-only textarea must exist (cycle-061 GREEN)

## Behavior

Replace the `readOnly` textarea with an editable one backed by a separate `specText` string state (initialized from `JSON.stringify(spec, null, 2)` when `spec` loads). Add a "Save Spec" button that parses `specText` as JSON and issues `PUT /api/config/update-spec` with `Content-Type: application/json` and the `Authorization` header. On success (status 200), briefly show "Saved!" text next to the button (set via a `saved` boolean state, reset after 2 seconds). If `JSON.parse` throws (malformed JSON), the PUT is not issued.

Integration smoke: with NestJS + DB running, admin logs in, visits `/admin`, edits the spec textarea, clicks "Save Spec" — `GET /api/config/update-spec` after the save returns the updated spec.

## RED
- **Test file**: `client/__tests__/app/admin/page.test.tsx`
- **Assertion** (add `it()` inside the existing `describe('AdminPage — config editor', ...)` block from cycle-061):
  ```ts
  it('lets user edit the textarea and clicking Save Spec PUTs the edited JSON', async () => {
    const mockSpec = { version: 1, actions: [] }
    const savedSpec = { version: 2, actions: ['run'] }

    global.fetch = jest.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('/api/admin/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            entityCount: 1, edgeCount: 0, sessionCount: 0, historyCount: 0, latestHistoryAt: null,
          }),
        } as any)
      }
      if (url.includes('/api/config/update-spec') && (!options || options.method !== 'PUT')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSpec),
        } as any)
      }
      if (url.includes('/api/config/update-spec') && options?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(savedSpec),
        } as any)
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    render(<AdminPage />)

    await waitFor(() => expect(screen.getByRole('textbox')).toBeInTheDocument())

    const textarea = screen.getByRole('textbox')
    await userEvent.clear(textarea)
    await userEvent.type(textarea, JSON.stringify(savedSpec))

    await userEvent.click(screen.getByRole('button', { name: /save spec/i }))

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/config/update-spec',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer header.eyJyb2xlIjoiQURNSU4ifQ.sig',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(savedSpec),
        }),
      )
    )

    expect(await screen.findByText(/saved!/i)).toBeInTheDocument()
  })
  ```
  Add `import userEvent from '@testing-library/user-event'` at the top of the test file if not already present.
- **Why it fails**: The textarea is `readOnly` (cycle-061 GREEN) and there is no "Save Spec" button, so both `userEvent.type` and `screen.getByRole('button', { name: /save spec/i })` fail.

## GREEN
- **Smallest change**: In `client/app/admin/page.tsx`:
  1. Add `const [specText, setSpecText] = useState<string>('')` and `const [saved, setSaved] = useState(false)`.
  2. In the `useEffect` that fetches the spec, after `setSpec(data)` also call `setSpecText(JSON.stringify(data, null, 2))`.
  3. Change the `<textarea>` to be editable:
     ```tsx
     <textarea
       className="w-full h-64 font-mono text-sm border rounded p-2"
       value={specText}
       onChange={(e) => setSpecText(e.target.value)}
     />
     ```
  4. Add a Save Spec button and saved indicator after the textarea:
     ```tsx
     <div className="mt-2 flex items-center gap-4">
       <button
         className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
         onClick={async () => {
           const token = localStorage.getItem('accessToken') ?? ''
           let parsed: object
           try { parsed = JSON.parse(specText) } catch { return }
           const res = await fetch('/api/config/update-spec', {
             method: 'PUT',
             headers: {
               Authorization: `Bearer ${token}`,
               'Content-Type': 'application/json',
             },
             body: JSON.stringify(parsed),
           })
           if (res.ok) {
             setSaved(true)
             setTimeout(() => setSaved(false), 2000)
           }
         }}
       >
         Save Spec
       </button>
       {saved && <span>Saved!</span>}
     </div>
     ```
- **Files touched**: `client/app/admin/page.tsx`

## REFACTOR
none
