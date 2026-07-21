import { useEffect, useState } from 'react';
import {
  soloRaceApi,
  type SoloAttemptRankingResponse,
  type SoloAttemptResultResponse,
} from '../api/soloRaceApi';

/**
 * Loads where a finished race placed on its snippet's leaderboard.
 *
 * Stays null until the server answers, so the screen never claims a personal
 * best or a rank it has not been told about yet. A failed lookup also stays
 * null and the screen simply shows the race's own numbers.
 */
export function useAttemptRanking(
  result: SoloAttemptResultResponse,
): SoloAttemptRankingResponse | null {
  const [ranking, setRanking] = useState<SoloAttemptRankingResponse | null>(
    null,
  );
  const { attemptId, state } = result;

  useEffect(() => {
    if (state !== 'COMPLETED') {
      return;
    }

    let active = true;
    soloRaceApi
      .getRanking(attemptId)
      .then((response) => {
        if (active) {
          setRanking(response);
        }
      })
      .catch((error: unknown) => {
        // The screen still shows the race's own numbers without a ranking, but
        // a silent catch makes a broken endpoint look like a slow one.
        console.warn('Could not load the ranking for this attempt', error);
      });

    return () => {
      active = false;
    };
  }, [attemptId, state]);

  return ranking;
}
