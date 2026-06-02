---
id: srv-069
slug: upload-panel-file-picker
status: done
source: "File picker component — accepts PDF and `.txt` files; Add to narrative UI as a 'World Seeding' panel or route"
covers: happy-path
group: upload-panel
---

## Behavior
`UploadPanel` renders a labelled file `<input>` restricted to `accept=".pdf,.txt"`, an "Upload" `<button>`, and a hidden loading indicator. The button is disabled when no file is selected.

## RED
- **Test file**: `client/src/components/UploadPanel.test.tsx`
- **Assertion**:
  ```tsx
  import { render, screen } from '@testing-library/react';
  import { UploadPanel } from './UploadPanel';

  describe('UploadPanel', () => {
    it('renders file input accepting .pdf and .txt, and a disabled Upload button when no file selected', () => {
      render(<UploadPanel />);
      const input = screen.getByLabelText(/choose file/i);
      expect(input).toHaveAttribute('accept', '.pdf,.txt');
      const btn = screen.getByRole('button', { name: /upload/i });
      expect(btn).toBeDisabled();
    });
  });
  ```
- **Why it fails**: `UploadPanel` component does not exist.

## GREEN
- **Smallest change**: Create `client/src/components/UploadPanel.tsx` as a `'use client'` React component with `useState<File | null>` for selected file. Render `<input type="file" accept=".pdf,.txt" id="file-pick" />` and `<button disabled={!file}>Upload</button>`.
- **Files touched**: `client/src/components/UploadPanel.tsx`

## REFACTOR
none

## Merge
Squash-merge this cycle's branch to `main` and delete it before starting the next cycle:
```bash
git checkout main
git merge --squash tdd/upload-panel-file-picker
git commit -m "feat(srv-069): <summary>"
git branch -D tdd/upload-panel-file-picker
```
