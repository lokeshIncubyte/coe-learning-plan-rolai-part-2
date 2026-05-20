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
