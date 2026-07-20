import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useServerCountdown } from './useServerCountdown';

describe('useServerCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-17T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is idle when there is no startedAt', () => {
    const { result } = renderHook(() => useServerCountdown(null));

    expect(result.current).toEqual({ secondsRemaining: null, status: 'idle' });
  });

  it('counts down to a future startedAt and reports elapsed once it passes', () => {
    const { result } = renderHook(() =>
      useServerCountdown('2026-07-17T12:00:03.000Z'),
    );

    expect(result.current.status).toBe('counting');
    expect(result.current.secondsRemaining).toBe(3);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.status).toBe('counting');
    expect(result.current.secondsRemaining).toBe(2);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toEqual({ secondsRemaining: 0, status: 'elapsed' });
  });

  it('reports elapsed immediately for a startedAt already in the past', () => {
    const { result } = renderHook(() =>
      useServerCountdown('2026-07-17T11:59:00.000Z'),
    );

    expect(result.current).toEqual({ secondsRemaining: 0, status: 'elapsed' });
  });

  it('recomputes from the server time rather than a fixed local duration', () => {
    // A client clock that runs slow relative to when startedAt was issued
    // must still land on the correct remaining time from Date.now().
    const { result } = renderHook(() =>
      useServerCountdown('2026-07-17T12:00:05.000Z'),
    );

    act(() => {
      vi.setSystemTime(new Date('2026-07-17T12:00:04.200Z'));
      vi.advanceTimersByTime(200);
    });

    expect(result.current.status).toBe('counting');
    expect(result.current.secondsRemaining).toBe(1);
  });

  it('stops ticking after unmount', () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const { unmount } = renderHook(() =>
      useServerCountdown('2026-07-17T12:00:03.000Z'),
    );

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
