---
id: cycle-060
slug: admin-page-upload-panel
status: done
source: "Admin page: mount UploadPanel below stats grid inside a 'Lore Upload' section"
covers: happy-path
group: admin-dashboard
---

## Dependencies
- `client/app/upload/components/UploadPanel.tsx` — already exists, exports `UploadPanel`
- `client/app/admin/page.tsx` — already exists (cycle-054)

## Behavior

Import `UploadPanel` from `../upload/components/UploadPanel` inside `client/app/admin/page.tsx` and render it below the stats grid, inside a `<section>` with an `<h2>Lore Upload</h2>` heading. `UploadPanel` already renders a file `<input accept=".pdf,.txt">` and an "Upload" button, so no changes to `UploadPanel` itself are needed. After this cycle the admin page is the single surface where lore files can be uploaded.

## RED
- **Test file**: `client/__tests__/app/admin/page.test.tsx`
- **Assertion** (add inside the existing `describe('AdminPage', ...)` block, after the existing `it` tests):
  ```ts
  it('renders UploadPanel with file input and Upload button', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        entityCount: 5,
        edgeCount: 3,
        sessionCount: 2,
        historyCount: 10,
        latestHistoryAt: '2026-05-21T10:00:00Z',
      }),
    } as any)

    render(<AdminPage />)

    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument())

    const fileInput = screen.getByLabelText(/choose file/i)
    expect(fileInput).toHaveAttribute('accept', '.pdf,.txt')
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
  })
  ```
- **Why it fails**: `AdminPage` does not yet render `UploadPanel`, so `screen.getByLabelText(/choose file/i)` throws "Unable to find a label with the text: /choose file/i".

## GREEN
- **Smallest change**: In `client/app/admin/page.tsx`, add the import and render the panel:
  1. Add `import { UploadPanel } from '../upload/components/UploadPanel'` at the top.
  2. Inside the returned JSX, after the stats `<div className="grid ...">`, add:
     ```tsx
     <section className="mt-8">
       <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Lore Upload</h2>
       <UploadPanel />
     </section>
     ```
- **Files touched**: `client/app/admin/page.tsx`

## REFACTOR
none
