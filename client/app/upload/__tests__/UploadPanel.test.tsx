import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UploadPanel } from '../components/UploadPanel';

describe('UploadPanel', () => {
  it('renders file input accepting .pdf and .txt, and a disabled Upload button when no file selected', () => {
    render(<UploadPanel />);
    const input = screen.getByLabelText(/choose file/i);
    expect(input).toHaveAttribute('accept', '.pdf,.txt');
    const btn = screen.getByRole('button', { name: /upload/i });
    expect(btn).toBeDisabled();
  });

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

  it('shows processing indicator and disables button while uploading', async () => {
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
});
