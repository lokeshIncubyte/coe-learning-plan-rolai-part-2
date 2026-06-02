---
id: srv-070
slug: upload-panel-processing-state
status: done
source: "Upload progress indicator — shows processing state while the server extracts entities"
covers: happy-path
group: upload-panel
---

## Behavior
While `UploadPanel` is waiting for the `POST /api/upload` response, it renders a text indicator (e.g. "Processing…") and disables the Upload button to prevent double-submission.

## RED
- **Test file**: `client/src/components/UploadPanel.test.tsx`
- **Assertion**:
  ```tsx
  import userEvent from '@testing-library/user-event';

  it('shows processing indicator and disables button while uploading', async () => {
    // never resolves — simulates in-flight request
    global.fetch = jest.fn(() => new Promise(() => {})) as any;

    render(<UploadPanel />);
    const input = screen.getByLabelText(/choose file/i);
    const file = new File(['hello'], 'world.txt', { type: 'text/plain' });
    await userEvent.upload(input, file);

    const btn = screen.getByRole('button', { name: /upload/i });
    await userEvent.click(btn);

    expect(screen.getByText(/processing/i)).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });
  ```
- **Why it fails**: `UploadPanel` has no `isUploading` state or "Processing…" indicator.

## GREEN
- **Smallest change**: Add `const [isUploading, setIsUploading] = useState(false)`. On button click, set `isUploading = true`, call `fetch('/api/upload', ...)`, then `setIsUploading(false)`. Render `{isUploading && <span>Processing…</span>}`. Disable button when `!file || isUploading`.
- **Files touched**: `client/src/components/UploadPanel.tsx`

## REFACTOR
none

## Merge
Squash-merge this cycle's branch to `main` and delete it before starting the next cycle:
```bash
git checkout main
git merge --squash tdd/upload-panel-processing-state
git commit -m "feat(srv-070): <summary>"
git branch -D tdd/upload-panel-processing-state
```
