import { useCallback, useEffect, useState } from 'react';
import { isSessionExpiredError } from '@/features/solo/api/soloApi';
import {
  statisticsApi,
  type DifficultyStatistics,
  type SnippetStatistics,
} from '../api/statisticsApi';

export type PersonalStatisticsStatus = 'error' | 'loading' | 'success';

export type PersonalStatisticsState = {
  personalStats: DifficultyStatistics[];
  retry: () => void;
  snippetStats: SnippetStatistics[];
  status: PersonalStatisticsStatus;
};

/**
 * Loads the signed-in player's per-difficulty summary metrics and per-snippet personal bests
 * once on mount. Both endpoints cover every difficulty in one response, so the page filters by
 * the selected tab locally instead of refetching on every tab switch.
 */
export function usePersonalStatistics(
  onSessionExpired: () => void,
): PersonalStatisticsState {
  const [personalStats, setPersonalStats] = useState<DifficultyStatistics[]>(
    [],
  );
  const [snippetStats, setSnippetStats] = useState<SnippetStatistics[]>([]);
  const [status, setStatus] = useState<PersonalStatisticsStatus>('loading');
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [difficulties, snippets] = await Promise.all([
          statisticsApi.getPersonalStatistics(),
          statisticsApi.getSnippetStatistics(),
        ]);
        if (!active) {
          return;
        }
        setPersonalStats(difficulties);
        setSnippetStats(snippets);
        setStatus('success');
      } catch (error) {
        if (!active) {
          return;
        }
        if (isSessionExpiredError(error)) {
          onSessionExpired();
          return;
        }
        setStatus('error');
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [onSessionExpired, retryToken]);

  const retry = useCallback(() => {
    setStatus('loading');
    setRetryToken((token) => token + 1);
  }, []);

  return { personalStats, retry, snippetStats, status };
}
