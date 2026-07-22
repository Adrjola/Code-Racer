import { describe, expect, it } from 'vitest';
import {
  formatRelativeTime,
  toPersonalActivityEntries,
  toPersonalActivityEntriesFromHistory,
  toPersonalStatsSummary,
} from './statisticsMappers';
import type {
  DifficultyStatistics,
  SnippetStatistics,
  SoloAttemptHistoryEntry,
} from './statisticsApi';

function difficultyStats(
  overrides: Partial<DifficultyStatistics> = {},
): DifficultyStatistics {
  return {
    averageCpm: 250,
    averageDurationMs: 30_000,
    difficulty: 'EASY',
    fastestDurationMs: 20_000,
    highestCpm: 300,
    ...overrides,
  };
}

function snippetStats(
  overrides: Partial<SnippetStatistics> = {},
): SnippetStatistics {
  return {
    bestCpm: 452,
    bestDurationMs: 41_201,
    bestFinishedAt: '2026-07-22T12:00:00Z',
    categoryName: 'java',
    difficulty: 'EASY',
    snippetId: 'snippet-1',
    snippetTitle: 'Two Sum',
    ...overrides,
  };
}

describe('toPersonalStatsSummary', () => {
  it('formats durations and passes cpm values through unchanged', () => {
    const summary = toPersonalStatsSummary(difficultyStats());

    expect(summary).toEqual({
      averageCpm: 250,
      averageTime: '0:30.000',
      fastestCpm: 300,
      fastestTime: '0:20.000',
    });
  });

  it('returns undefined when the difficulty has no completed attempts', () => {
    const summary = toPersonalStatsSummary(
      difficultyStats({
        averageCpm: null,
        averageDurationMs: null,
        fastestDurationMs: null,
        highestCpm: null,
      }),
    );

    expect(summary).toBeUndefined();
  });

  it('returns undefined when no stats are provided for the difficulty', () => {
    expect(toPersonalStatsSummary(undefined)).toBeUndefined();
  });
});

describe('toPersonalActivityEntries', () => {
  it('maps snippet fields, formats duration, and upper-cases the category', () => {
    const now = new Date('2026-07-22T12:05:00Z');

    const entries = toPersonalActivityEntries([snippetStats()], now);

    expect(entries).toEqual([
      {
        category: 'JAVA',
        cpm: 452,
        id: 'snippet-1',
        relativeTime: '5 min ago',
        snippetName: 'Two Sum',
        time: '0:41.201',
      },
    ]);
  });

  it('preserves the API-provided order instead of resorting', () => {
    const now = new Date('2026-07-22T12:05:00Z');
    const older = snippetStats({
      bestFinishedAt: '2026-07-20T12:00:00Z',
      snippetId: 'snippet-2',
      snippetTitle: 'Group By Count',
    });
    const newer = snippetStats({
      snippetId: 'snippet-1',
      snippetTitle: 'Two Sum',
    });

    const entries = toPersonalActivityEntries([older, newer], now);

    expect(entries.map((entry) => entry.snippetName)).toEqual([
      'Group By Count',
      'Two Sum',
    ]);
  });

  it('returns an empty list for an empty input', () => {
    expect(toPersonalActivityEntries([])).toEqual([]);
  });
});

function historyEntry(
  overrides: Partial<SoloAttemptHistoryEntry> = {},
): SoloAttemptHistoryEntry {
  return {
    attemptId: 'attempt-1',
    cpm: 452,
    difficulty: 'EASY',
    durationMs: 41_201,
    finishedAt: '2026-07-22T12:00:00Z',
    snippet: {
      category: 'JAVA',
      snippetId: 'snippet-1',
      title: 'Two Sum',
    },
    ...overrides,
  };
}

describe('toPersonalActivityEntriesFromHistory', () => {
  it('maps attempt fields, formats duration, and reformats the raw category', () => {
    const now = new Date('2026-07-22T12:05:00Z');

    const entries = toPersonalActivityEntriesFromHistory([historyEntry()], now);

    expect(entries).toEqual([
      {
        category: 'JAVA',
        cpm: 452,
        id: 'attempt-1',
        relativeTime: '5 min ago',
        snippetName: 'Two Sum',
        time: '0:41.201',
      },
    ]);
  });

  it('replaces underscores in multi-word category enum values', () => {
    const entries = toPersonalActivityEntriesFromHistory([
      historyEntry({
        snippet: {
          category: 'REST_APIS',
          snippetId: 'snippet-2',
          title: 'Ping',
        },
      }),
    ]);

    expect(entries[0].category).toBe('REST APIS');
  });

  it('keys each entry by attemptId so repeat runs on the same snippet stay distinct', () => {
    const entries = toPersonalActivityEntriesFromHistory([
      historyEntry({ attemptId: 'attempt-1' }),
      historyEntry({ attemptId: 'attempt-2' }),
    ]);

    expect(entries.map((entry) => entry.id)).toEqual([
      'attempt-1',
      'attempt-2',
    ]);
  });

  it('preserves the API-provided order instead of resorting', () => {
    const entries = toPersonalActivityEntriesFromHistory([
      historyEntry({
        attemptId: 'attempt-2',
        snippet: {
          category: 'SQL',
          snippetId: 'snippet-2',
          title: 'Group By Count',
        },
      }),
      historyEntry({ attemptId: 'attempt-1' }),
    ]);

    expect(entries.map((entry) => entry.snippetName)).toEqual([
      'Group By Count',
      'Two Sum',
    ]);
  });

  it('returns an empty list for an empty input', () => {
    expect(toPersonalActivityEntriesFromHistory([])).toEqual([]);
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-07-22T12:05:00Z');

  it('reports seconds-old timestamps as just now', () => {
    expect(formatRelativeTime('2026-07-22T12:04:45Z', now)).toBe('just now');
  });

  it('reports minutes ago under an hour', () => {
    expect(formatRelativeTime('2026-07-22T12:00:00Z', now)).toBe('5 min ago');
  });

  it('pluralizes hours correctly', () => {
    expect(formatRelativeTime('2026-07-22T11:05:00Z', now)).toBe('1 hr ago');
    expect(formatRelativeTime('2026-07-22T10:05:00Z', now)).toBe('2 hrs ago');
  });

  it('pluralizes days correctly', () => {
    expect(formatRelativeTime('2026-07-21T12:05:00Z', now)).toBe('1 day ago');
    expect(formatRelativeTime('2026-07-20T12:05:00Z', now)).toBe('2 days ago');
  });
});
