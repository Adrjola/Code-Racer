import { describe, expect, it } from 'vitest';
import { formatDuration } from './formatDuration';

describe('formatDuration', () => {
  it('formats minutes, seconds, and milliseconds', () => {
    expect(formatDuration(41_201)).toBe('0:41.201');
  });

  it('pads single-digit seconds and short millisecond remainders', () => {
    expect(formatDuration(5_007)).toBe('0:05.007');
  });

  it('carries minutes past 59 seconds', () => {
    expect(formatDuration(75_000)).toBe('1:15.000');
  });

  it('formats a zero duration', () => {
    expect(formatDuration(0)).toBe('0:00.000');
  });

  it('returns a placeholder for a null duration', () => {
    expect(formatDuration(null)).toBe('--');
  });
});
