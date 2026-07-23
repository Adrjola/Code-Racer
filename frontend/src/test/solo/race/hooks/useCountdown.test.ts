import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clockSkewMs,
  useCountdown,
} from '../../../../features/solo/race/hooks/useCountdown';

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

  it('still counts three when the browser clock is far behind the server', () => {
    // The browser thinks it is 00:00:00 while the server is 27 seconds ahead,
    // which is what produced a 30 second countdown for a 3 second race start.
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const serverTime = '2026-01-01T00:00:27.000Z';
    const startedAt = '2026-01-01T00:00:30.000Z';

    const skew = clockSkewMs(serverTime, Date.now());
    expect(skew).toBe(27_000);

    const { result } = renderHook(() => useCountdown(startedAt, skew));
    expect(result.current).toBe(3);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current).toBe(0);
  });

  it('still counts three when the browser clock runs ahead of the server', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:10.000Z'));
    const serverTime = '2026-01-01T00:00:00.000Z';
    const startedAt = '2026-01-01T00:00:03.000Z';

    const skew = clockSkewMs(serverTime, Date.now());
    expect(skew).toBe(-10_000);

    const { result } = renderHook(() => useCountdown(startedAt, skew));
    expect(result.current).toBe(3);
  });

  it('treats a missing server time as no skew', () => {
    expect(clockSkewMs('not-a-date', Date.now())).toBe(0);
  });

  it('returns zero for a target date in the past', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:10.000Z'));
    const target = new Date('2026-01-01T00:00:00.000Z').toISOString();

    const { result } = renderHook(() => useCountdown(target));
    expect(result.current).toBe(0);
  });
});
