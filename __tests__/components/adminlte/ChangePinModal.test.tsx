/**
 * @vitest-environment jsdom
 */
import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import ChangePinModal from '@/components/adminlte/ChangePinModal';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { userId: 'u1' } }, status: 'authenticated' }),
}));

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn(() => Promise.resolve({ isConfirmed: true })),
  },
}));

describe('ChangePinModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockClear();
  });

  it('renders nothing when isOpen is false', () => {
    render(<ChangePinModal isOpen={false} onClose={onClose} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders modal when isOpen is true', () => {
    render(<ChangePinModal isOpen={true} onClose={onClose} />);
    expect(screen.getByText(/ubah pin|ganti pin|change pin/i)).toBeInTheDocument();
  });

  it('shows PIN inputs when open', () => {
    render(<ChangePinModal isOpen={true} onClose={onClose} />);
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    expect(passwordInputs.length).toBeGreaterThanOrEqual(1);
  });
});
