import React, { useRef, useEffect, useState, useCallback } from 'react';
import { processBeforeInputData } from './processBeforeInputData';
import { useExactCodeTypingEngine } from '../hooks/useExactCodeTypingEngine';
import { useCountdown } from '../hooks/useCountdown';
import type {
  ExactCodeTypingEngineTransport,
  RaceSnippet,
} from '../types/race.types';
import { SoloRaceHeader } from './SoloRaceHeader';
import { SoloRaceStatsRow } from './SoloRaceStatsRow';
import { SoloRaceWorldBest } from './SoloRaceWorldBest';
import { SoloRaceKeyboardHints } from './SoloRaceKeyboardHints';
import { codePointLength, sliceCodePoints } from '../utils/codePointText';

interface SoloRaceProps {
  snippet: RaceSnippet;
  startedAt: string;
  transport?: ExactCodeTypingEngineTransport;
  onLobbyNavigate?: () => void | Promise<void>;
  onRestartRace?: () => void | Promise<void>;
  onStartRace?: () => void | Promise<void>;
  errorMessage?: string | null;
}

export const SoloRace: React.FC<SoloRaceProps> = ({
  snippet,
  startedAt,
  transport,
  onLobbyNavigate,
  onRestartRace,
  onStartRace,
  errorMessage,
}) => {
  const { state, handleInput, handleDelete } = useExactCodeTypingEngine(
    snippet,
    startedAt,
    transport,
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isTabPressedRef = useRef(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [localRaceStarted, setLocalRaceStarted] = useState(false);
  const [dismissedAttemptKey, setDismissedAttemptKey] = useState<string | null>(
    null,
  );
  const [isBootstrappingRace, setIsBootstrappingRace] = useState(false);
  const attemptKey = transport ? `${snippet.id}:${startedAt}` : null;
  const hasRaceStarted =
    localRaceStarted ||
    (attemptKey !== null && dismissedAttemptKey !== attemptKey);
  const countdown = useCountdown(hasRaceStarted ? startedAt : null);

  const isCountdownActive =
    hasRaceStarted && countdown !== null && countdown > 0;
  const isLocked = !hasRaceStarted || isCountdownActive;

  const focusInput = useCallback(() => {
    /* v8 ignore next */
    if (!isLocked) {
      inputRef.current?.focus();
    }
  }, [isLocked]);

  useEffect(() => {
    if (!isLocked) {
      focusInput();
    }
  }, [isLocked, focusInput]);

  useEffect(() => {
    if (state.isFinished || !hasRaceStarted || isLocked) {
      return;
    }

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [hasRaceStarted, isLocked, state.isFinished]);

  const terminateRaceToMenu = () => {
    setLocalRaceStarted(false);
    setDismissedAttemptKey(attemptKey);
    setNowMs(Date.now());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isLocked) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      terminateRaceToMenu();
      return;
    }

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      restartRace();
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      handleDelete();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      isTabPressedRef.current = true;
      handleInput(' ');
      handleInput(' ');
      handleInput(' ');
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      isTabPressedRef.current = false;
    }
  };

  const preventDefault = (e: React.SyntheticEvent) => e.preventDefault();

  const goToLobby = async () => {
    if (isBootstrappingRace) return;

    if (onLobbyNavigate) {
      setIsBootstrappingRace(true);
      try {
        await onLobbyNavigate();
      } finally {
        setIsBootstrappingRace(false);
      }
      return;
    }

    terminateRaceToMenu();
  };

  const restartRace = async () => {
    if (isBootstrappingRace) return;

    if (onRestartRace) {
      setIsBootstrappingRace(true);
      try {
        await onRestartRace();
        setDismissedAttemptKey(null);
        setLocalRaceStarted(true);
        setNowMs(Date.now());
      } catch {
        setLocalRaceStarted(false);
      } finally {
        setIsBootstrappingRace(false);
      }
      return;
    }

    setDismissedAttemptKey(null);
    setLocalRaceStarted(true);
    setNowMs(Date.now());
  };

  const typedLength = codePointLength(state.acceptedPrefix);
  const totalLength = Math.max(codePointLength(state.targetCode), 1);
  const progressPercent = Math.max(
    0,
    Math.min(100, (typedLength / totalLength) * 100),
  );
  const startedAtMs = Date.parse(startedAt);
  const elapsedMs =
    hasRaceStarted && !isCountdownActive && Number.isFinite(startedAtMs)
      ? Math.max(0, nowMs - startedAtMs)
      : 0;
  const activeElapsedSeconds = Math.floor(elapsedMs / 1000);
  const resultElapsedSeconds =
    state.result?.durationMs !== null && state.result?.durationMs !== undefined
      ? Math.floor(state.result.durationMs / 1000)
      : null;

  const elapsedSeconds = resultElapsedSeconds ?? activeElapsedSeconds;
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const elapsed = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const acceptedChars = codePointLength(state.acceptedPrefix);
  const cpm =
    state.result?.cpm ??
    (elapsedSeconds > 0
      ? Math.round((acceptedChars / 5 / elapsedSeconds) * 60)
      : 0);
  const line = Math.min(
    state.acceptedPrefix.split('\n').length,
    snippet.code.split('\n').length,
  );
  const totalLines = snippet.code.split('\n').length;

  const startRace = async () => {
    if (isBootstrappingRace) return;

    if (onStartRace) {
      setIsBootstrappingRace(true);
      try {
        await onStartRace();
        setDismissedAttemptKey(null);
        setLocalRaceStarted(true);
        setNowMs(Date.now());
      } catch {
        setLocalRaceStarted(false);
      } finally {
        setIsBootstrappingRace(false);
      }
      return;
    }

    setDismissedAttemptKey(null);
    setLocalRaceStarted(true);
    setNowMs(Date.now());
  };

  // Rendering characters
  const renderCode = () => {
    const { targetCode, acceptedPrefix, currentInput } = state;
    const remaining = sliceCodePoints(
      targetCode,
      codePointLength(acceptedPrefix),
    );
    const incorrectPart = currentInput;

    // We need to be careful with rest calculation if currentInput has multi-byte chars
    const incorrectCharCount = codePointLength(incorrectPart);

    // Slice target remaining by the number of characters in incorrectPart
    const targetArray = Array.from(remaining);
    const rest = targetArray.slice(incorrectCharCount).join('');

    return (
      <pre
        className={`font-mono text-lg leading-relaxed whitespace-pre-wrap break-all select-none transition duration-200 ${
          isLocked ? 'blur-[2px]' : ''
        }`}
      >
        <span className="text-slate-100">{acceptedPrefix}</span>
        {incorrectPart && (
          <span className="bg-rose-500/25 text-rose-400 underline decoration-rose-400">
            {incorrectPart}
          </span>
        )}
        <span className="relative text-slate-200/40">
          {!incorrectPart && !isLocked && (
            <span className="absolute -left-[1px] top-0 bottom-0 w-[2px] bg-emerald-400 animate-pulse" />
          )}
          {rest}
        </span>
      </pre>
    );
  };

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#08051A] font-sans text-slate-50 lg:h-[100dvh] lg:min-h-0 lg:w-screen lg:overflow-hidden">
      <div className="min-h-[100dvh] lg:fixed lg:left-0 lg:top-0 lg:h-[1080px] lg:min-h-0 lg:w-[1920px] lg:origin-top-left lg:[transform:scale(var(--page-scale))]">
        <SoloRaceHeader onLobby={goToLobby} onRestart={restartRace} />

        <main className="mx-auto mt-[110px] w-full px-10" onClick={focusInput}>
          <div className="grid grid-cols-[minmax(0,1fr)_487px] items-start gap-10">
            <div className="mx-auto flex w-full max-w-[868.63px] flex-col">
              <SoloRaceStatsRow
                cpm={cpm}
                currentLine={line}
                elapsed={elapsed}
                progressPercent={progressPercent}
                totalLines={totalLines}
              />

              <div
                className="relative h-[667px] w-full rounded-2xl border border-[#2D2544] bg-[#0E0A1F] p-8"
                style={{
                  boxShadow: '0px 30px 80px -20px rgba(219, 39, 119, 0.7)',
                }}
              >
                {renderCode()}

                {errorMessage ? (
                  <div className="pointer-events-none absolute inset-x-8 top-8 z-10 rounded-lg border border-rose-300/50 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
                    {errorMessage}
                  </div>
                ) : null}

                {isCountdownActive && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="font-mono text-8xl font-extrabold leading-none text-[#FDE68A] drop-shadow-[0_0_24px_rgba(244,114,182,0.55)]">
                      {countdown}
                    </span>
                  </div>
                )}

                <textarea
                  ref={inputRef}
                  readOnly={isLocked}
                  className="absolute inset-0 h-full w-full resize-none cursor-default opacity-0"
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  /* v8 ignore next */
                  onBeforeInput={(e: React.FormEvent<HTMLTextAreaElement>) =>
                    processBeforeInputData(
                      isLocked,
                      (e.nativeEvent as InputEvent).data,
                      handleInput,
                      () => e.preventDefault(),
                    )
                  }
                  onPaste={preventDefault}
                  onDrop={preventDefault}
                  autoCapitalize="off"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>

              <div className="mt-[10px]">
                <SoloRaceKeyboardHints />
              </div>
            </div>

            {!hasRaceStarted && (
              <div className="mx-0 w-[487px]">
                <SoloRaceWorldBest onStartRace={startRace} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
