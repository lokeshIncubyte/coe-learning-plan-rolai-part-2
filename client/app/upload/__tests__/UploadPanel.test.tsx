import { render, screen } from '@testing-library/react';
import { UploadPanel } from '../components/UploadPanel';

describe('UploadPanel', () => {
  it('renders file input accepting .pdf and .txt, and a disabled Upload button when no file selected', () => {
    render(<UploadPanel />);
    const input = screen.getByLabelText(/choose file/i);
    expect(input).toHaveAttribute('accept', '.pdf,.txt');
    const btn = screen.getByRole('button', { name: /upload/i });
    expect(btn).toBeDisabled();
  });
});
