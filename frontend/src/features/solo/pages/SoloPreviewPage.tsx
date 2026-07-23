import { useEffect, useMemo, useRef, useState } from 'react';
import Toast from '@/components/Toast';
import { difficultyDisplayName } from '@/features/admin/difficulties';
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
  /** Sends the player back to the picker with a reason to show there. */
  onNoSnippets: (message: string) => void;
  /** Leaves the race for the homepage, which is the real mode-select screen. */
  onExitRace: () => void;
  onSessionExpired: () => void;
  selection: SoloSelection;
};

const messageClassName =
  'flex min-h-[60dvh] items-center justify-center px-4 text-center font-mono text-sm text-text-muted';

export default function SoloPreviewPage({
  onExitRace,
  onNoSnippets,
  onSessionExpired,
  selection,
}: SoloPreviewPageProps) {
  const {
    dismissNotice,
    notice,
    refresh,
    resetStart,
    snippetPhase,
    start,
    startPhase,
  } = useSoloPreview({
    category: selection.category,
    difficulty: selection.difficulty,
    onSessionExpired,
  });
  const [result, setResult] = useState<SoloAttemptResultResponse | null>(null);

  const attempt = startPhase.phase === 'started' ? startPhase.attempt : null;
  const skewMs = startPhase.phase === 'started' ? startPhase.skewMs : 0;

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

  const isEmpty = snippetPhase.phase === 'empty';
  useEffect(() => {
    if (isEmpty) {
      onNoSnippets(
        `No ${difficultyDisplayName(selection.difficulty)} snippets in ${selection.categoryName} yet.`,
      );
    }
  }, [isEmpty, onNoSnippets, selection]);

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

  // Nothing to race means nothing to show, so hand the player straight back to
  // the picker and let it say why.
  if (snippetPhase.phase === 'empty' || !snippet) {
    return null;
  }

  return (
    <>
      {notice && <Toast message={notice} onDismiss={dismissNotice} />}
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
        skewMs={skewMs}
        snippet={snippet}
        startedAt={attempt?.startedAt ?? ''}
        transport={transport}
      />
    </>
  );
}
