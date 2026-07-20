import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type SyntheticEvent,
} from 'react';
import { useCountdown } from '../hooks/useCountdown';
import { useExactCodeTypingEngine } from '../hooks/useExactCodeTypingEngine';
import type {
  ExactCodeTypingEngineTransport,
  RaceSnippet,
} from '../types/race.types';
import { codePointLength, sliceCodePoints } from '../utils/codePointText';
import { processBeforeInputData } from '../utils/processBeforeInputData';
import { SoloRaceHeader } from './SoloRaceHeader';
import { SoloRaceKeyboardHints } from './SoloRaceKeyboardHints';
import { SoloRaceStatsRow } from './SoloRaceStatsRow';
import { SoloRaceWorldBest } from './SoloRaceWorldBest';

interface SoloRaceProps {
  errorMessage?: string | null;
  onLobbyNavigate?: () => void | Promise<void>;
  onRestartRace?: () => void | Promise<void>;
  onStartRace?: () => void | Promise<void>;
  snippet: RaceSnippet;
  startedAt: string;
  transport?: ExactCodeTypingEngineTransport;
}

export function SoloRace({
  errorMessage,
  onLobbyNavigate,
  onRestartRace,
  onStartRace,
  snippet,
  startedAt,
  transport,
}: SoloRaceProps) {
  const { state, handleInput, handleDelete } = useExactCodeTypingEngine(
    snippet,
    startedAt,
    transport,
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [hasRaceStarted, setHasRaceStarted] = useState(false);
  const [isBootstrappingRace, setIsBootstrappingRace] = useState(false);

  const countdown = useCountdown(
    hasRaceStarted && startedAt ? startedAt : null,
  );
  const isCountdownActive = countdown !== null && countdown > 0;
  const raceStartedAtMs =
    hasRaceStarted && startedAt ? Date.parse(startedAt) : null;
  const isLocked = !hasRaceStarted || !startedAt || isCountdownActive;

  const focusInput = useCallback(() => {
    if (!isLocked) {
      inputRef.current?.focus();
    }
  }, [isLocked]);

  useEffect(() => {
    if (!isLocked) {
      focusInput();
    }
  }, [focusInput, isLocked]);

  useEffect(() => {
    if (state.isFinished || !hasRaceStarted || raceStartedAtMs === null) {
      return;
    }

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [hasRaceStarted, raceStartedAtMs, state.isFinished]);

  const [renderedSnippetId, setRenderedSnippetId] = useState(snippet.id);
  if (renderedSnippetId !== snippet.id) {
    setRenderedSnippetId(snippet.id);
    setHasRaceStarted(false);
  }

  const terminateRaceToMenu = () => {
    setHasRaceStarted(false);
    setNowMs(Date.now());
  };

  const goToLobby = async () => {
    if (isBootstrappingRace) {
      return;
    }

    if (onLobbyNavigate) {
      setIsBootstrappingRace(true);
      try {
        await onLobbyNavigate();
        terminateRaceToMenu();
      } finally {
        setIsBootstrappingRace(false);
      }
      return;
    }

    terminateRaceToMenu();
  };

  const restartRace = async () => {
    if (isBootstrappingRace) {
      return;
    }

    if (onRestartRace) {
      setIsBootstrappingRace(true);
      try {
        await onRestartRace();
      } finally {
        setIsBootstrappingRace(false);
      }
    }

    terminateRaceToMenu();
  };

  const startRace = async () => {
    if (isBootstrappingRace) {
      return;
    }

    if (onStartRace) {
      setIsBootstrappingRace(true);
      try {
        await onStartRace();
        setHasRaceStarted(true);
        setNowMs(Date.now());
      } catch {
        setHasRaceStarted(false);
      } finally {
        setIsBootstrappingRace(false);
      }
      return;
    }

    setHasRaceStarted(true);
    setNowMs(Date.now());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isLocked) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      void goToLobby();
      return;
    }

    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void restartRace();
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      handleDelete();
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      handleInput(' ');
      handleInput(' ');
      handleInput(' ');
    }
  };

  const preventDefault = (event: SyntheticEvent) => event.preventDefault();

  const typedLength = codePointLength(state.acceptedPrefix);
  const totalLength = Math.max(codePointLength(state.targetCode), 1);
  const progressPercent = Math.max(
    0,
    Math.min(100, (typedLength / totalLength) * 100),
  );
  const elapsedMs =
    raceStartedAtMs !== null && Number.isFinite(raceStartedAtMs)
      ? Math.max(0, nowMs - raceStartedAtMs)
      : 0;
  const activeElapsedSeconds = hasRaceStarted
    ? Math.floor(elapsedMs / 1000)
    : 0;
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

  const renderCode = () => {
    const { targetCode, acceptedPrefix, currentInput } = state;
    const remaining = sliceCodePoints(
      targetCode,
      codePointLength(acceptedPrefix),
    );
    const incorrectPart = currentInput;
    const incorrectCharCount = codePointLength(incorrectPart);
    const rest = Array.from(remaining).slice(incorrectCharCount).join('');

    return (
      <pre
        className={`whitespace-pre-wrap break-all font-mono text-sm leading-relaxed transition duration-200 select-none sm:text-base lg:text-lg ${
          isLocked ? 'blur-[2px]' : ''
        }`}
      >
        <span className="text-slate-100">{acceptedPrefix}</span>
        {incorrectPart && (
          <span className="bg-rose-500/25 text-rose-400 underline decoration-rose-400">
            {incorrectPart}
          </span>
        )}
        <span className="text-slate-200/40">
          {!incorrectPart && !isLocked && (
            <span className="inline-block h-[1.15em] w-[2px] translate-y-[0.2em] animate-pulse bg-emerald-400" />
          )}
          {rest}
        </span>
      </pre>
    );
  };

  return (
    <div className="min-h-screen w-full bg-[#08051A] text-slate-50">
      <SoloRaceHeader onLobby={goToLobby} onRestart={restartRace} />

      <div
        className="mx-auto mt-6 w-full max-w-[1920px] px-4 sm:px-6 lg:mt-10"
        onClick={focusInput}
      >
        <div className="flex flex-col items-center gap-6 lg:relative lg:block lg:min-h-[980px] lg:gap-0">
          <div className="w-full max-w-[868.63px] lg:absolute lg:left-1/2 lg:top-[37px] lg:-translate-x-1/2">
            <SoloRaceStatsRow
              cpm={cpm}
              currentLine={line}
              elapsed={elapsed}
              progressPercent={progressPercent}
              totalLines={totalLines}
            />
          </div>

          <div className="w-full max-w-[611px] lg:absolute lg:left-1/2 lg:top-[125px] lg:-translate-x-1/2">
            <div
              className="relative min-h-[360px] rounded-2xl border border-[#2D2544] bg-[#0E0A1F] p-5 sm:p-8 lg:h-[667px] lg:min-h-0"
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
                  <span className="font-mono text-8xl leading-none font-extrabold text-[#FDE68A] drop-shadow-[0_0_24px_rgba(244,114,182,0.55)]">
                    {countdown}
                  </span>
                </div>
              )}

              <textarea
                ref={inputRef}
                readOnly={isLocked}
                className="absolute inset-0 h-full w-full cursor-default resize-none opacity-0"
                onKeyDown={handleKeyDown}
                onBeforeInput={(event: FormEvent<HTMLTextAreaElement>) => {
                  const { data } = event as FormEvent<HTMLTextAreaElement> & {
                    data?: string | null;
                  };
                  processBeforeInputData(isLocked, data, handleInput, () =>
                    event.preventDefault(),
                  );
                }}
                onPaste={preventDefault}
                onDrop={preventDefault}
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
          </div>

          {!hasRaceStarted && (
            <div className="w-full max-w-[487px] lg:absolute lg:right-[38px] lg:top-[120px] lg:w-auto">
              <SoloRaceWorldBest onStartRace={startRace} />
            </div>
          )}

          <div className="w-full lg:absolute lg:left-1/2 lg:top-[802px] lg:w-auto lg:-translate-x-1/2">
            <SoloRaceKeyboardHints />
          </div>
        </div>
      </div>
    </div>
  );
}
