import { useEffect, useMemo, useState } from 'react';
import type { RaceSnippet } from '../types/race.types';
import { soloRaceApi } from '../api/soloRaceApi';
import { createSoloRaceTransport } from '../api/soloRaceTransport';

interface SoloRaceSession {
  snippet: RaceSnippet;
  startedAt: string;
  transport: ReturnType<typeof createSoloRaceTransport>;
}

interface SoloRacePreview {
  snippet: RaceSnippet;
}

export function useSoloRaceSession() {
  const [session, setSession] = useState<SoloRaceSession | null>(null);
  const [preview, setPreview] = useState<SoloRacePreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapSnippet = (snippet: Awaited<ReturnType<typeof soloRaceApi.getRandomSnippet>>): RaceSnippet => ({
    id: snippet.id,
    code: snippet.source,
    type: snippet.difficulty,
  });

  const loadPreviewSnippet = async () => {
    const snippet = await soloRaceApi.getRandomSnippet();
    setPreview({
      snippet: mapSnippet(snippet),
    });
  };

  const startNewRace = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const snippet = await soloRaceApi.getRandomSnippet();
      const attempt = await soloRaceApi.startAttempt(snippet.id);

      const raceSnippet = mapSnippet(snippet);
      setPreview({ snippet: raceSnippet });
      setSession({
        snippet: raceSnippet,
        startedAt: attempt.startedAt,
        transport: createSoloRaceTransport(attempt.attemptId),
      });
    } catch {
      setError('failed_to_start_solo_race');
    } finally {
      setIsLoading(false);
    }
  };

  const resetToMenuState = async () => {
    setSession(null);
    setIsLoading(true);
    setError(null);
    try {
      await loadPreviewSnippet();
    } catch {
      setError('failed_to_start_solo_race');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const snippet = await soloRaceApi.getRandomSnippet();
        if (!active) return;

        setPreview({
          snippet: mapSnippet(snippet),
        });
      } catch {
        if (!active) return;
        setSession(null);
        setPreview(null);
        setError('failed_to_start_solo_race');
      } finally {
        if (!active) return;
        setIsLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

    return useMemo(
    () => ({
      session,
      preview,
      isLoading,
      error,
      startNewRace,
      resetToMenuState,
    }),
    [error, isLoading, preview, session],
  );
}
