import { useMemo, useState } from 'react';
import {
  soloRaceApi,
  type SoloAttemptResultResponse,
} from '@/features/solo-race/api/soloRaceApi';
import { createSoloRaceTransport } from '@/features/solo-race/api/soloRaceTransport';
import { SoloRace } from '@/features/solo-race/components/SoloRace';
import { SoloRaceResult } from '@/features/solo-race/components/SoloRaceResult';
import type { RaceSnippet } from '@/features/solo-race/types/race.types';
import type { SoloSelection } from '@/features/solo/soloApi';
import { useSoloSetup } from '@/features/solo/useSoloSetup';

type SoloPreviewPageProps = {
  /** Leaves the race for the dashboard, which is the real mode-select screen. */
  onExitRace: () => void;
  onSessionExpired: () => void;
  selection: SoloSelection;
};

const messageClassName =
  'flex min-h-[60dvh] items-center justify-center px-4 text-center font-mono text-sm text-text-muted';

/**
 * One screen for the whole run: it previews a snippet for the chosen selection,
 * starts the attempt, counts down to the server's startedAt, races, and then
 * shows the result the server scored.
 */
export default function SoloPreviewPage({
  onExitRace,
  onSessionExpired,
  selection,
}: SoloPreviewPageProps) {
  const { refresh, snippetPhase, start, startPhase } = useSoloSetup({
    initialCategoryId: selection.categoryId,
    initialDifficulty: selection.difficulty,
    onSessionExpired,
  });
  const [result, setResult] = useState<SoloAttemptResultResponse | null>(null);

  const attempt = startPhase.phase === 'started' ? startPhase.attempt : null;

  const transport = useMemo(
    () =>
      attempt
        ? createSoloRaceTransport(attempt.attemptId, { onResult: setResult })
        : undefined,
    [attempt],
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

  // An unfinished attempt has to be abandoned, or it stays ACTIVE and the next
  // start is rejected with ONE_ACTIVE_ATTEMPT_ALLOWED.
  const endAttempt = async () => {
    if (!attempt || result) {
      return;
    }
    await soloRaceApi.abandonAttempt(attempt.attemptId).catch(() => undefined);
  };

  const raceAgain = async () => {
    await endAttempt();
    setResult(null);
    refresh();
  };

  if (result) {
    return (
      <SoloRaceResult
        onLobby={onExitRace}
        onRaceAgain={raceAgain}
        result={result}
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
      onRestartRace={raceAgain}
      onStartRace={start}
      snippet={snippet}
      startedAt={attempt?.startedAt ?? ''}
      transport={transport}
    />
  );
}
