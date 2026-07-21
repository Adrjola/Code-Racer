import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BenjiTerminal from './BenjiTerminal';

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches } as MediaQueryList),
  );
}

describe('BenjiTerminal', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the terminal header', () => {
    render(<BenjiTerminal />);

    expect(screen.getByText(/BENJI\.exe/)).toBeInTheDocument();
    expect(screen.getByText(/v1\.0/)).toBeInTheDocument();
    expect(screen.getByText(/TYPING/)).toBeInTheDocument();
  });

  it('shows the full monologue immediately when reduced motion is preferred', () => {
    mockReducedMotion(true);

    render(<BenjiTerminal />);

    expect(screen.getByText(/your coach\. lucky you\./)).toBeInTheDocument();
  });

  it('types the monologue out over time instead of showing it immediately', () => {
    mockReducedMotion(false);
    vi.useFakeTimers();

    render(<BenjiTerminal />);

    expect(
      screen.queryByText(/your coach\. lucky you\./),
    ).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(screen.getByText(/your coach\. lucky you\./)).toBeInTheDocument();
  });

  it('applies the passed className to the outer wrapper', () => {
    mockReducedMotion(true);

    const { container } = render(<BenjiTerminal className="custom-class" />);

    expect(container.firstElementChild).toHaveClass('custom-class');
  });
});
