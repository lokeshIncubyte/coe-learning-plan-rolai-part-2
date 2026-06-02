---
id: srv-071
slug: upload-panel-entity-summary
status: done
source: "Display extracted entity summary after upload completes (count of entities/edges created)"
covers: happy-path
group: upload-panel
---

## Behavior
After a successful upload response, `UploadPanel` renders the entity and edge counts returned by the server (`entityCount`, `edgeCount`).

## RED
- **Test file**: `client/src/components/UploadPanel.test.tsx`
- **Assertion**:
  ```tsx
  it('shows entity and edge counts after successful upload', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ entityCount: 3, edgeCount: 2, chunkCount: 1 }),
    }) as any;

    render(<UploadPanel />);
    const input = screen.getByLabelText(/choose file/i);
    const file = new File(['lore text'], 'world.txt', { type: 'text/plain' });
    await userEvent.upload(input, file);
    await userEvent.click(screen.getByRole('button', { name: /upload/i }));

    expect(await screen.findByText(/3 entities/i)).toBeInTheDocument();
    expect(screen.getByText(/2 edges/i)).toBeInTheDocument();
  });
  ```
- **Why it fails**: `UploadPanel` has no summary state or result display.

## GREEN
- **Smallest change**: Add `const [summary, setSummary] = useState<{ entityCount: number; edgeCount: number } | null>(null)`. After successful fetch, call `setSummary(data)`. Render `{summary && <p>{summary.entityCount} entities, {summary.edgeCount} edges added.</p>}`.
- **Files touched**: `client/src/components/UploadPanel.tsx`

## REFACTOR
Extract the fetch logic into a `handleUpload` async function for clarity.

## Merge
Squash-merge this cycle's branch to `main` and delete it before starting the next cycle:
```bash
git checkout main
git merge --squash tdd/upload-panel-entity-summary
git commit -m "feat(srv-071): <summary>"
git branch -D tdd/upload-panel-entity-summary
```
