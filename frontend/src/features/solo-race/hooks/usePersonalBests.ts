import { useEffect, useState } from 'react';
import {
  soloRaceApi,
  type SoloAttemptResultResponse,
} from '../api/soloRaceApi';

export type PersonalBests = {
  /**
   * False until the history lookup settles. Callers must not read a null best as
   * "no previous best" before this is true, or the screen claims a personal best
   * on every race for the moment before history arrives.
   */
  isLoaded: boolean;
  /** Best cpm before this attempt, or null when this was the first. */
  previousBestCpm: number | null;
  /** Best duration before this attempt, or null when this was the first. */
  previousBestDurationMs: number | null;
};

const EMPTY: PersonalBests = {
  isLoaded: false,
  previousBestCpm: null,
  previousBestDurationMs: null,
};

function firstOther<T extends { attemptId: string }>(
  attempts: T[],
  excludeAttemptId: string,
): T | undefined {
  return attempts.find((attempt) => attempt.attemptId !== excludeAttemptId);
}

/**
 * Looks up what the player had achieved before the attempt just finished, so the
 * result screen can say whether it was a personal best. The freshly finished
 * attempt is filtered out, which is why two rows are fetched per sort.
 */
export function usePersonalBests(
  result: SoloAttemptResultResponse,
): PersonalBests {
  const [bests, setBests] = useState<PersonalBests>(EMPTY);
  const { attemptId } = result;

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [byCpm, byDuration] = await Promise.all([
        soloRaceApi.getBestCompleted('cpm,desc').catch(() => []),
        soloRaceApi.getBestCompleted('durationMs,asc').catch(() => []),
      ]);

      if (!active) {
        return;
      }

      setBests({
        isLoaded: true,
        previousBestCpm: firstOther(byCpm, attemptId)?.cpm ?? null,
        previousBestDurationMs:
          firstOther(byDuration, attemptId)?.durationMs ?? null,
      });
    };

    void load();
    return () => {
      active = false;
    };
  }, [attemptId]);

  return bests;
}
