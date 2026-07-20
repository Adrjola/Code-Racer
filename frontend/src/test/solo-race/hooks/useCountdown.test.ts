import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCountdown } from '../../../features/solo-race/hooks/useCountdown';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when target date is not provided', () => {
    const { result } = renderHook(() => useCountdown(null));
    expect(result.current).toBeNull();
  });

  it('counts down to zero for a future target date', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const target = new Date('2026-01-01T00:00:03.000Z').toISOString();

    const { result } = renderHook(() => useCountdown(target));
    expect(result.current).toBe(3);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(2);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current).toBe(0);
  });

  it('returns zero for a target date in the past', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:10.000Z'));
    const target = new Date('2026-01-01T00:00:00.000Z').toISOString();

    const { result } = renderHook(() => useCountdown(target));
    expect(result.current).toBe(0);
  });
});
