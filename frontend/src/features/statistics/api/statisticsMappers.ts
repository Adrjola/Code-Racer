import { formatDuration } from '../utils/formatDuration';
import type { PersonalActivityEntry, PersonalStatsSummary } from '../types';
import type { DifficultyStatistics, SnippetStatistics } from './statisticsApi';

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

/** Maps the personal-best-per-snippet list onto the snippet log's shape, already API-sorted. */
export function toPersonalActivityEntries(
  snippets: SnippetStatistics[],
  now: Date = new Date(),
): PersonalActivityEntry[] {
  return snippets.map((snippet) => ({
    category: snippet.categoryName.toUpperCase(),
    cpm: snippet.bestCpm,
    relativeTime: formatRelativeTime(snippet.bestFinishedAt, now),
    snippetId: snippet.snippetId,
    snippetName: snippet.snippetTitle,
    time: formatDuration(snippet.bestDurationMs),
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
