import { useCallback, useEffect, useState } from 'react';
import { isSessionExpiredError } from '@/lib/apiClient';
import type { Difficulty } from '@/features/solo/api/soloApi';
import {
  statisticsApi,
  type GlobalLeaderboardEntry,
} from '../api/statisticsApi';

export type GlobalLeaderboardStatus = 'error' | 'loading' | 'success';

export type GlobalLeaderboardState = {
  entries: GlobalLeaderboardEntry[];
  retry: () => void;
  status: GlobalLeaderboardStatus;
};

type FetchResult = {
  entries: GlobalLeaderboardEntry[];
  key: string;
  status: 'error' | 'success';
};

/**
 * Loads the ranked leaderboard for one difficulty, refetching whenever the difficulty changes.
 * "Loading" is derived from the last completed result's key not matching the current one
 * (difficulty or a retry) rather than an explicit effect-start setState, which avoids the
 * cascading-render setState-in-effect the linter flags for synchronous status resets.
 */
export function useGlobalLeaderboard(
  difficulty: Difficulty,
  onSessionExpired: () => void,
): GlobalLeaderboardState {
  const [result, setResult] = useState<FetchResult | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const key = `${difficulty}:${retryToken}`;

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const entries = await statisticsApi.getGlobalLeaderboard(difficulty);
        if (!active) {
          return;
        }
        setResult({ entries, key, status: 'success' });
      } catch (error) {
        if (!active) {
          return;
        }
        if (isSessionExpiredError(error)) {
          onSessionExpired();
          return;
        }
        setResult({ entries: [], key, status: 'error' });
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [difficulty, key, onSessionExpired]);

  const retry = useCallback(() => setRetryToken((token) => token + 1), []);

  if (result?.key === key) {
    return { entries: result.entries, retry, status: result.status };
  }
  return { entries: [], retry, status: 'loading' };
}
