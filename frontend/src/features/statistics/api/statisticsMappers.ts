import { formatDuration } from '../utils/formatDuration';
import type {
  GlobalRankingEntry,
  PersonalActivityEntry,
  PersonalStatsSummary,
} from '../types';
import type {
  DifficultyStatistics,
  GlobalLeaderboardEntry,
  SnippetStatistics,
  SoloAttemptHistoryEntry,
} from './statisticsApi';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Maps one difficulty's aggregate metrics onto the summary grid's shape, formatting only. */
export function toPersonalStatsSummary(
  stats: DifficultyStatistics | undefined,
): PersonalStatsSummary | undefined {
  if (
    !stats ||
    (stats.fastestDurationMs === null &&
      stats.highestCpm === null &&
      stats.averageDurationMs === null &&
      stats.averageCpm === null)
  ) {
    return undefined;
  }

  return {
    averageCpm: stats.averageCpm,
    averageTime: formatDuration(stats.averageDurationMs),
    fastestCpm: stats.highestCpm,
    fastestTime: formatDuration(stats.fastestDurationMs),
  };
}

/**
 * Maps the global leaderboard onto the ranking table's shape, formatting only: rank, username,
 * and cpm come straight from the backend, which already owns ordering and tie-breaking.
 */
export function toGlobalRankingEntries(
  entries: GlobalLeaderboardEntry[],
): GlobalRankingEntry[] {
  return entries.map((entry) => ({
    cpm: entry.cpm,
    fastestTime: formatDuration(entry.durationMs),
    rank: entry.rank,
    username: entry.username,
  }));
}

/** Maps the personal-best-per-snippet list onto the snippet log's shape, already API-sorted. */
export function toPersonalActivityEntries(
  snippets: SnippetStatistics[],
  now: Date = new Date(),
): PersonalActivityEntry[] {
  return snippets.map((snippet) => ({
    category: snippet.categoryName.toUpperCase(),
    cpm: snippet.bestCpm,
    id: snippet.snippetId,
    relativeTime: formatRelativeTime(snippet.bestFinishedAt, now),
    snippetName: snippet.snippetTitle,
    time: formatDuration(snippet.bestDurationMs),
  }));
}

/**
 * Maps the recent-attempts list onto the same snippet log shape as the Best view, already
 * API-sorted most-recent-first. Unlike Best, the same snippet can appear more than once here, so
 * each row's id is the attempt's id rather than the snippet's.
 */
export function toPersonalActivityEntriesFromHistory(
  attempts: SoloAttemptHistoryEntry[],
  now: Date = new Date(),
): PersonalActivityEntry[] {
  return attempts.map((attempt) => ({
    category: attempt.snippet.category.replace(/_/g, ' '),
    cpm: attempt.cpm,
    id: attempt.attemptId,
    relativeTime: formatRelativeTime(attempt.finishedAt, now),
    snippetName: attempt.snippet.title,
    time: formatDuration(attempt.durationMs),
  }));
}

/** Formats how long ago an ISO timestamp was, in the coarsest unit that fits. */
export function formatRelativeTime(
  isoTimestamp: string,
  now: Date = new Date(),
): string {
  const elapsedMs = Math.max(
    0,
    now.getTime() - new Date(isoTimestamp).getTime(),
  );

  if (elapsedMs < MINUTE_MS) {
    return 'just now';
  }
  if (elapsedMs < HOUR_MS) {
    const minutes = Math.floor(elapsedMs / MINUTE_MS);
    return `${minutes} min ago`;
  }
  if (elapsedMs < DAY_MS) {
    const hours = Math.floor(elapsedMs / HOUR_MS);
    return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.floor(elapsedMs / DAY_MS);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
