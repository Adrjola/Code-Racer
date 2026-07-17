import { useEffect, useMemo, useRef, useState } from 'react';
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
  const actionIdRef = useRef(0);

  const mapSnippet = (snippet: Awaited<ReturnType<typeof soloRaceApi.getRandomSnippet>>): RaceSnippet => ({
    id: snippet.id,
    code: snippet.source,
    type: snippet.difficulty,
  });

  const loadPreviewSnippet = async () => {
    const snippet = await soloRaceApi.getRandomSnippet();
    return mapSnippet(snippet);
  };

  const startNewRace = async () => {
    const actionId = ++actionIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const snippet = await soloRaceApi.getRandomSnippet();
      const attempt = await soloRaceApi.startAttempt(snippet.id);
      if (actionId !== actionIdRef.current) return;

      const raceSnippet = mapSnippet(snippet);
      setPreview({ snippet: raceSnippet });
      setSession({
        snippet: raceSnippet,
        startedAt: attempt.startedAt,
        transport: createSoloRaceTransport(attempt.attemptId),
      });
    } catch {
      if (actionId !== actionIdRef.current) return;
      setError('failed_to_start_solo_race');
    } finally {
      if (actionId !== actionIdRef.current) return;
      setIsLoading(false);
    }
  };

  const resetToMenuState = async () => {
    const actionId = ++actionIdRef.current;
    setSession(null);
    setIsLoading(true);
    setError(null);
    try {
      const snippet = await loadPreviewSnippet();
      if (actionId !== actionIdRef.current) return;
      setPreview({ snippet });
    } catch {
      if (actionId !== actionIdRef.current) return;
      setError('failed_to_start_solo_race');
    } finally {
      if (actionId !== actionIdRef.current) return;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const actionId = ++actionIdRef.current;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const snippet = await loadPreviewSnippet();
        if (!active || actionId !== actionIdRef.current) return;

        setPreview({
          snippet,
        });
      } catch {
        if (!active || actionId !== actionIdRef.current) return;
        setSession(null);
        setPreview(null);
        setError('failed_to_start_solo_race');
      } finally {
        if (!active || actionId !== actionIdRef.current) return;
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
