import { useEffect, useMemo, useRef, useState } from 'react';
import {
  soloRaceApi,
  type SoloAttemptResultResponse,
} from '@/features/solo/race/api/soloRaceApi';
import type { StartSoloAttemptResponse } from '@/features/solo/api/soloApi';
import { createSoloRaceTransport } from '@/features/solo/race/api/soloRaceTransport';
import { SoloRace } from '@/features/solo/race/components/SoloRace';
import { SoloRaceResult } from '@/features/solo/race/components/SoloRaceResult';
import type { RaceSnippet } from '@/features/solo/race/types/race.types';
import type { SoloSelection } from '@/features/solo/api/soloApi';
import { useSoloPreview } from '@/features/solo/hooks/useSoloPreview';

type SoloPreviewPageProps = {
  /** Leaves the race for the homepage, which is the real mode-select screen. */
  onExitRace: () => void;
  onSessionExpired: () => void;
  selection: SoloSelection;
};

const messageClassName =
  'flex min-h-[60dvh] items-center justify-center px-4 text-center font-mono text-sm text-text-muted';

export default function SoloPreviewPage({
  onExitRace,
  onSessionExpired,
  selection,
}: SoloPreviewPageProps) {
  const { refresh, resetStart, snippetPhase, start, startPhase } =
    useSoloPreview({
      category: selection.category,
      difficulty: selection.difficulty,
      onSessionExpired,
    });
  const [result, setResult] = useState<SoloAttemptResultResponse | null>(null);

  const attempt = startPhase.phase === 'started' ? startPhase.attempt : null;

  const transport = useMemo(
    () =>
      attempt
        ? createSoloRaceTransport(attempt.attemptId, {
            onResult: setResult,
            onSessionExpired,
          })
        : undefined,
    [attempt, onSessionExpired],
  );

  const snippet: RaceSnippet | null = useMemo(
    () =>
      snippetPhase.phase === 'ready'
        ? {
            code: snippetPhase.snippet.source,
            id: snippetPhase.snippet.id,
            type: snippetPhase.snippet.difficulty,
          }
        : null,
    [snippetPhase],
  );

  const endAttempt = async () => {
    if (!attempt || result) {
      return;
    }
    await soloRaceApi.abandonAttempt(attempt.attemptId).catch(() => undefined);
  };

  const attemptRef = useRef<StartSoloAttemptResponse | null>(null);
  const resultRef = useRef<SoloAttemptResultResponse | null>(null);
  useEffect(() => {
    attemptRef.current = attempt;
    resultRef.current = result;
  }, [attempt, result]);

  useEffect(
    () => () => {
      const pending = attemptRef.current;
      if (pending && !resultRef.current) {
        void soloRaceApi
          .abandonAttempt(pending.attemptId)
          .catch(() => undefined);
      }
    },
    [],
  );

  const raceAgain = async () => {
    await endAttempt();
    setResult(null);
    resetStart();
  };

  // Same reset as a restart, except the preview also pulls a different snippet
  // for the same category and difficulty.
  const newSnippet = async () => {
    await raceAgain();
    refresh();
  };

  if (result) {
    return (
      <SoloRaceResult
        onLobby={onExitRace}
        onNewSnippet={newSnippet}
        onRaceAgain={raceAgain}
        result={result}
        snippetCode={snippet?.code ?? null}
      />
    );
  }

  if (snippetPhase.phase === 'loading') {
    return <p className={messageClassName}>Loading a snippet...</p>;
  }

  if (snippetPhase.phase === 'empty') {
    return (
      <p className={messageClassName}>
        No snippets match {selection.categoryName} on {selection.difficulty}. Go
        back and pick a different combination.
      </p>
    );
  }

  if (!snippet) {
    return (
      <p className={messageClassName} role="alert">
        {snippetPhase.phase === 'error'
          ? snippetPhase.message
          : 'Unable to load a snippet.'}
      </p>
    );
  }

  return (
    <SoloRace
      errorMessage={
        startPhase.phase === 'error' ? startPhase.message : undefined
      }
      onLobbyNavigate={async () => {
        await endAttempt();
        onExitRace();
      }}
      onNewSnippet={newSnippet}
      onRestartRace={raceAgain}
      onStartRace={start}
      snippet={snippet}
      startedAt={attempt?.startedAt ?? ''}
      transport={transport}
    />
  );
}
