import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from './LandingPage';

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList),
  );
}

describe('LandingPage', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the Play button and its nag line', () => {
    render(<LandingPage onPlay={vi.fn()} />);

    expect(screen.getByText(/c’mon, hit it already/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  it('calls onPlay when the Play button is clicked', async () => {
    const onPlay = vi.fn();
    const user = userEvent.setup();
    render(<LandingPage onPlay={onPlay} />);

    await user.click(screen.getByRole('button', { name: /play/i }));

    expect(onPlay).toHaveBeenCalledOnce();
  });

  it('renders the Benji terminal alongside the Play CTA', () => {
    render(<LandingPage onPlay={vi.fn()} />);

    expect(screen.getByText(/BENJI\.exe/)).toBeInTheDocument();
  });

  it('renders in the desktop layout without crashing', () => {
    mockMatchMedia(true);

    render(<LandingPage onPlay={vi.fn()} />);

    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });
});
