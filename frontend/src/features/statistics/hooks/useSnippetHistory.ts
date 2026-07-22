import { useCallback, useEffect, useState } from 'react';
import { isSessionExpiredError } from '@/lib/apiClient';
import type { Difficulty } from '@/features/solo/api/soloApi';
import {
  statisticsApi,
  type SoloAttemptHistoryEntry,
} from '../api/statisticsApi';

export type SnippetHistoryStatus = 'error' | 'idle' | 'loading' | 'success';

export type SnippetHistoryState = {
  entries: SoloAttemptHistoryEntry[];
  retry: () => void;
  status: SnippetHistoryStatus;
};

type FetchResult = {
  entries: SoloAttemptHistoryEntry[];
  key: string;
  status: 'error' | 'success';
};

/**
 * Loads the signed-in player's recent completed attempts for one difficulty, only while `enabled`
 * (the History view is selected) so switching difficulty tabs on the Best view never triggers an
 * extra fetch. "Loading" is derived from the last completed result's key not matching the current
 * one (difficulty or a retry) rather than an explicit effect-start setState, which avoids the
 * cascading-render setState-in-effect the linter flags for synchronous status resets.
 */
export function useSnippetHistory(
  difficulty: Difficulty,
  enabled: boolean,
  onSessionExpired: () => void,
): SnippetHistoryState {
  const [result, setResult] = useState<FetchResult | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const key = `${difficulty}:${retryToken}`;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let active = true;

    const load = async () => {
      try {
        const entries = await statisticsApi.getAttemptHistory(difficulty);
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
  }, [difficulty, enabled, key, onSessionExpired]);

  const retry = useCallback(() => setRetryToken((token) => token + 1), []);

  if (!enabled) {
    return { entries: [], retry, status: 'idle' };
  }
  if (result?.key === key) {
    return { entries: result.entries, retry, status: result.status };
  }
  return { entries: [], retry, status: 'loading' };
}
