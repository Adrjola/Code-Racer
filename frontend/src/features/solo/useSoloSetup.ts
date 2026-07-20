import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchCategories,
  fetchRandomSnippet,
  isNoEligibleSnippetError,
  isSessionExpiredError,
  isSnippetUnavailableError,
  readableSoloError,
  startSoloAttempt,
  type Category,
  type Difficulty,
  type SnippetPreview,
  type StartSoloAttemptResponse,
} from './soloApi';

export type SnippetPhase =
  | { phase: 'empty' }
  | { phase: 'error'; message: string }
  | { phase: 'loading' }
  | { phase: 'ready'; snippet: SnippetPreview };

export type StartPhase =
  | {
      attempt: StartSoloAttemptResponse;
      phase: 'started';
      snippet: SnippetPreview;
    }
  | { phase: 'error'; message: string }
  | { phase: 'idle' }
  | { phase: 'starting' };

export type UseSoloSetupOptions = {
  /** Selection carried over from the setup screen. */
  initialCategoryId?: string;
  initialDifficulty?: Difficulty;
  onSessionExpired?: () => void;
};

export type UseSoloSetupResult = {
  categories: Category[];
  categoriesError: string | null;
  categoryId: string | undefined;
  difficulty: Difficulty | undefined;
  refresh: () => void;
  resetStart: () => void;
  setCategoryId: (categoryId: string | undefined) => void;
  setDifficulty: (difficulty: Difficulty | undefined) => void;
  snippetPhase: SnippetPhase;
  start: () => Promise<void>;
  startPhase: StartPhase;
};

export function useSoloSetup(
  options: UseSoloSetupOptions = {},
): UseSoloSetupResult {
  const [categoryId, setCategoryIdState] = useState<string | undefined>(
    options.initialCategoryId,
  );
  const [difficulty, setDifficultyState] = useState<Difficulty | undefined>(
    options.initialDifficulty,
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [snippetPhase, setSnippetPhase] = useState<SnippetPhase>({
    phase: 'loading',
  });
  const [startPhase, setStartPhase] = useState<StartPhase>({ phase: 'idle' });

  const startInFlightRef = useRef(false);
  const requestIdRef = useRef(0);
  const onSessionExpiredRef = useRef(options.onSessionExpired);

  useEffect(() => {
    onSessionExpiredRef.current = options.onSessionExpired;
  }, [options.onSessionExpired]);

  const handleSessionExpired = useCallback(() => {
    onSessionExpiredRef.current?.();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((result) => {
        if (!cancelled) {
          setCategories(result);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        if (isSessionExpiredError(error)) {
          handleSessionExpired();
          return;
        }
        setCategoriesError(readableSoloError(error));
      });
    return () => {
      cancelled = true;
    };
  }, [handleSessionExpired]);

  // Only fetches and resolves the outcome via .then()/.catch(); it never sets
  // the 'loading' phase itself. Callers that trigger a new fetch from an
  // event handler (setCategoryId/setDifficulty/refresh) set 'loading'
  // synchronously there instead, so the effect below never calls setState
  // synchronously in its own body.
  const loadSnippet = useCallback(
    (excludeId?: string) => {
      const requestId = ++requestIdRef.current;
      fetchRandomSnippet({ categoryId, difficulty, excludeId })
        .then((snippet) => {
          if (requestIdRef.current !== requestId) {
            return;
          }
          setSnippetPhase({ phase: 'ready', snippet });
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
    [categoryId, difficulty, handleSessionExpired],
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

  // Clears a finished/abandoned attempt so the screen falls back to its
  // pre-start state on the same snippet, ready to start a fresh attempt.
  const resetStart = useCallback(() => {
    setStartPhase({ phase: 'idle' });
  }, []);

  /**
   * Rejects when no attempt was created, so the caller can stay on the
   * pre-start screen instead of showing a race that the server never started.
   */
  const start = useCallback(async () => {
    if (startInFlightRef.current || snippetPhase.phase !== 'ready') {
      throw new Error('solo_start_unavailable');
    }
    const snippet = snippetPhase.snippet;
    startInFlightRef.current = true;
    setStartPhase({ phase: 'starting' });

    let attempt: StartSoloAttemptResponse;
    try {
      attempt = await startSoloAttempt(snippet.id);
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

    setStartPhase({ attempt, phase: 'started', snippet });
  }, [handleSessionExpired, loadSnippet, snippetPhase]);

  const setCategoryId = useCallback((next: string | undefined) => {
    setCategoryIdState(next);
    setSnippetPhase({ phase: 'loading' });
    setStartPhase((prev) =>
      prev.phase === 'starting' || prev.phase === 'started'
        ? prev
        : { phase: 'idle' },
    );
  }, []);

  const setDifficulty = useCallback((next: Difficulty | undefined) => {
    setDifficultyState(next);
    setSnippetPhase({ phase: 'loading' });
    setStartPhase((prev) =>
      prev.phase === 'starting' || prev.phase === 'started'
        ? prev
        : { phase: 'idle' },
    );
  }, []);

  return {
    categories,
    categoriesError,
    categoryId,
    difficulty,
    refresh,
    resetStart,
    setCategoryId,
    setDifficulty,
    snippetPhase,
    start,
    startPhase,
  };
}
