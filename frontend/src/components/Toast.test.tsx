import { render, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Toast from './Toast';

const VISIBLE_MS = 4000;
const FADE_MS = 400;
const TOTAL_MS = VISIBLE_MS + FADE_MS;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Toast', () => {
  it('dismisses itself once the message has been shown and faded', () => {
    const onDismiss = vi.fn();
    render(<Toast message="only snippet" onDismiss={onDismiss} />);

    expect(screen.getByRole('status')).toHaveTextContent('only snippet');

    act(() => {
      vi.advanceTimersByTime(TOTAL_MS - 1);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('keeps its countdown when the owner re-renders with a new callback', () => {
    const onDismiss = vi.fn();
    // An unmemoised inline arrow, which is what a caller writes by default.
    const { rerender } = render(
      <Toast message="only snippet" onDismiss={() => onDismiss()} />,
    );

    act(() => {
      vi.advanceTimersByTime(TOTAL_MS - 100);
    });

    // Something unrelated re-renders the owner, handing over a fresh function.
    rerender(<Toast message="only snippet" onDismiss={() => onDismiss()} />);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // The timer was never restarted, so it still fires on the original schedule.
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('gives a replacement message its own full countdown', () => {
    const onDismiss = vi.fn();
    const { rerender } = render(
      <Toast message="first" onDismiss={onDismiss} />,
    );

    act(() => {
      vi.advanceTimersByTime(TOTAL_MS - 100);
    });

    rerender(<Toast message="second" onDismiss={onDismiss} />);
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByRole('status')).toHaveTextContent('second');
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(TOTAL_MS);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
