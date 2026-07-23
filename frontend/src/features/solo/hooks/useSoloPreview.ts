import { useCallback, useEffect, useRef, useState } from 'react';
import { isSessionExpiredError } from '@/lib/apiClient';
import { clockSkewMs } from '../race/hooks/useCountdown';
import {
  fetchRandomSnippet,
  isNoEligibleSnippetError,
  isSnippetUnavailableError,
  readableSoloError,
  startSoloAttempt,
  type Category,
  type Difficulty,
  type SnippetPreview,
  type StartSoloAttemptResponse,
} from '../api/soloApi';

export type SnippetPhase =
  | { phase: 'empty' }
  | { phase: 'error'; message: string }
  | { phase: 'loading' }
  | { phase: 'ready'; snippet: SnippetPreview };

export type StartPhase =
  | {
      attempt: StartSoloAttemptResponse;
      phase: 'started';
      skewMs: number;
      snippet: SnippetPreview;
    }
  | { phase: 'error'; message: string }
  | { phase: 'idle' }
  | { phase: 'starting' };

export type UseSoloPreviewOptions = {
  category?: Category;
  difficulty?: Difficulty;
  onSessionExpired?: () => void;
};

export type UseSoloPreviewResult = {
  refresh: () => void;
  resetStart: () => void;
  snippetPhase: SnippetPhase;
  start: () => Promise<void>;
  startPhase: StartPhase;
};

export function useSoloPreview({
  category,
  difficulty,
  onSessionExpired,
}: UseSoloPreviewOptions = {}): UseSoloPreviewResult {
  const [snippetPhase, setSnippetPhase] = useState<SnippetPhase>({
    phase: 'loading',
  });
  const [startPhase, setStartPhase] = useState<StartPhase>({ phase: 'idle' });

  const startInFlightRef = useRef(false);
  const requestIdRef = useRef(0);
  const onSessionExpiredRef = useRef(onSessionExpired);

  useEffect(() => {
    onSessionExpiredRef.current = onSessionExpired;
  }, [onSessionExpired]);

  const handleSessionExpired = useCallback(() => {
    onSessionExpiredRef.current?.();
  }, []);

  const loadSnippet = useCallback(
    (excludeId?: string) => {
      const requestId = ++requestIdRef.current;
      fetchRandomSnippet({ category, difficulty, excludeId })
        .then((snippet) => {
          if (requestIdRef.current === requestId) {
            setSnippetPhase({ phase: 'ready', snippet });
          }
        })
        .catch((error: unknown) => {
          if (requestIdRef.current !== requestId) {
            return;
          }

          if (isSessionExpiredError(error)) {
            handleSessionExpired();
            return;
          }

          if (isNoEligibleSnippetError(error)) {
            setSnippetPhase({ phase: 'empty' });
            return;
          }

          setSnippetPhase({
            message: readableSoloError(error),
            phase: 'error',
          });
        });
    },
    [category, difficulty, handleSessionExpired],
  );

  useEffect(() => {
    loadSnippet();
  }, [loadSnippet]);

  const refresh = useCallback(() => {
    setSnippetPhase({ phase: 'loading' });
    loadSnippet(
      snippetPhase.phase === 'ready' ? snippetPhase.snippet.id : undefined,
    );
  }, [loadSnippet, snippetPhase]);

  const resetStart = useCallback(() => {
    setStartPhase({ phase: 'idle' });
  }, []);

  const start = useCallback(async () => {
    if (startInFlightRef.current || snippetPhase.phase !== 'ready') {
      throw new Error('solo_start_unavailable');
    }

    const snippet = snippetPhase.snippet;
    startInFlightRef.current = true;
    setStartPhase({ phase: 'starting' });

    let attempt: StartSoloAttemptResponse;
    let skewMs: number;
    try {
      attempt = await startSoloAttempt(snippet.id);
      skewMs = clockSkewMs(attempt.serverTime, Date.now());
    } catch (error: unknown) {
      if (isSessionExpiredError(error)) {
        handleSessionExpired();
      } else {
        setStartPhase({ message: readableSoloError(error), phase: 'error' });
        if (isSnippetUnavailableError(error)) {
          loadSnippet();
        }
      }
      throw error;
    } finally {
      startInFlightRef.current = false;
    }

    if (attempt.codeSnippetId !== snippet.id) {
      setStartPhase({
        message:
          'Your selection changed before starting. Refresh and try again.',
        phase: 'error',
      });
      throw new Error('solo_snippet_changed');
    }

    setStartPhase({ attempt, phase: 'started', skewMs, snippet });
  }, [handleSessionExpired, loadSnippet, snippetPhase]);

  return {
    refresh,
    resetStart,
    snippetPhase,
    start,
    startPhase,
  };
}
