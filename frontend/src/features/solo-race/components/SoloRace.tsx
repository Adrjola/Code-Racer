import React, { useRef, useEffect, useState } from 'react';
import { useExactCodeTypingEngine } from '../hooks/useExactCodeTypingEngine';
import { useCountdown } from '../hooks/useCountdown';
import { processBeforeInputData } from '../utils/processBeforeInputData';
import type {
  ExactCodeTypingEngineTransport,
  RaceSnippet,
} from '../types/race.types';
import { SoloRaceHeader } from './SoloRaceHeader';
import { SoloRaceStatsRow } from './SoloRaceStatsRow';
import { SoloRaceWorldBest } from './SoloRaceWorldBest';
import { SoloRaceKeyboardHints } from './SoloRaceKeyboardHints';

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
  const countdown = useCountdown(startedAt);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isTabPressedRef = useRef(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [finishedElapsedSeconds, setFinishedElapsedSeconds] = useState<
    number | null
  >(null);
  const [hasRaceStarted, setHasRaceStarted] = useState(false);
  const [raceStartedAtMs, setRaceStartedAtMs] = useState<number | null>(null);
  const [startCountdown, setStartCountdown] = useState<number | null>(null);
  const [isBootstrappingRace, setIsBootstrappingRace] = useState(false);

  const isLocked =
    !hasRaceStarted ||
    startCountdown !== null ||
    (countdown !== null && countdown > 0);

  const focusInput = () => {
    /* v8 ignore next */
    if (!isLocked) {
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    if (!isLocked) {
      focusInput();
    }
  }, [isLocked]);

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

  useEffect(() => {
    if (startCountdown === null) {
      return;
    }

    // Both the tick and the hand-off happen on the timer, so the effect never
    // sets state during the render that scheduled it.
    const timer = window.setTimeout(() => {
      if (startCountdown <= 1) {
        setStartCountdown(null);
        const startTimestamp = Date.now();
        setRaceStartedAtMs(startTimestamp);
        setNowMs(startTimestamp);
        focusInput();
        return;
      }

      setStartCountdown(startCountdown - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [startCountdown]);

  // Loading a different snippet returns the screen to its pre-race state. This
  // is React's documented "adjust state when a prop changes" pattern: it runs
  // during render rather than in an effect, so there is no extra render pass.
  const [renderedSnippetId, setRenderedSnippetId] = useState(snippet.id);
  if (renderedSnippetId !== snippet.id) {
    setRenderedSnippetId(snippet.id);
    setHasRaceStarted(false);
    setRaceStartedAtMs(null);
    setFinishedElapsedSeconds(null);
    setStartCountdown(null);
    // nowMs is deliberately left alone: with raceStartedAtMs null the elapsed
    // time reads 0 anyway, and Date.now() cannot be called during render.
  }

  const terminateRaceToMenu = () => {
    setHasRaceStarted(false);
    setStartCountdown(null);
    setRaceStartedAtMs(null);
    setFinishedElapsedSeconds(null);
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
        setHasRaceStarted(true);
        setStartCountdown(3);
      } catch {
        setHasRaceStarted(false);
        setStartCountdown(null);
      } finally {
        setIsBootstrappingRace(false);
      }
      return;
    }

    setHasRaceStarted(true);
    setStartCountdown(3);
  };

  const typedLength = Array.from(state.acceptedPrefix).length;
  const totalLength = Math.max(Array.from(state.targetCode).length, 1);
  const progressPercent = Math.max(
    0,
    Math.min(100, (typedLength / totalLength) * 100),
  );
  const elapsedMs =
    raceStartedAtMs !== null ? Math.max(0, nowMs - raceStartedAtMs) : 0;
  const activeElapsedSeconds = hasRaceStarted
    ? Math.floor(elapsedMs / 1000)
    : 0;

  // Freeze the clock at the moment the race finishes, and release it when a new
  // race begins. Adjusted during render for the same reason as the snippet
  // reset above: an effect would only re-render a second time to do the same.
  const isRaceFinished = hasRaceStarted && state.isFinished;
  if (isRaceFinished && finishedElapsedSeconds === null) {
    setFinishedElapsedSeconds(activeElapsedSeconds);
  }
  if (!isRaceFinished && finishedElapsedSeconds !== null) {
    setFinishedElapsedSeconds(null);
  }

  const elapsedSeconds = finishedElapsedSeconds ?? activeElapsedSeconds;
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const elapsed = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const acceptedChars = Array.from(state.acceptedPrefix).length;
  const cpm =
    elapsedSeconds > 0
      ? Math.round((acceptedChars / 5 / elapsedSeconds) * 60)
      : 0;
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
        setHasRaceStarted(true);
        setStartCountdown(3);
      } catch {
        setHasRaceStarted(false);
        setStartCountdown(null);
      } finally {
        setIsBootstrappingRace(false);
      }
      return;
    }

    setHasRaceStarted(true);
    setStartCountdown(3);
  };

  // Rendering characters
  const renderCode = () => {
    const { targetCode, acceptedPrefix, currentInput } = state;
    const remaining = targetCode.slice(acceptedPrefix.length);
    const incorrectPart = currentInput;

    // We need to be careful with rest calculation if currentInput has multi-byte chars
    const incorrectCharCount = Array.from(incorrectPart).length;

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
    <div className="w-full min-h-screen bg-[#08051A] text-slate-50">
      <SoloRaceHeader onLobby={goToLobby} onRestart={restartRace} />

      <div
        className="mx-auto mt-10 w-full max-w-[1920px] px-6"
        onClick={focusInput}
      >
        <div className="relative min-h-[980px]">
          <div className="absolute left-1/2 top-[37px] w-[868.63px] -translate-x-1/2">
            <SoloRaceStatsRow
              cpm={cpm}
              currentLine={line}
              elapsed={elapsed}
              progressPercent={progressPercent}
              totalLines={totalLines}
            />
          </div>

          <div className="absolute left-1/2 top-[125px] w-[611px] -translate-x-1/2">
            <div
              className="relative h-[667px] rounded-2xl border border-[#2D2544] bg-[#0E0A1F] p-8"
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

              {startCountdown !== null && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-8xl font-extrabold leading-none text-[#FDE68A] drop-shadow-[0_0_24px_rgba(244,114,182,0.55)]">
                    {startCountdown}
                  </span>
                </div>
              )}

              <textarea
                ref={inputRef}
                readOnly={isLocked}
                className="absolute inset-0 w-full h-full opacity-0 cursor-default resize-none"
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                /* v8 ignore next */
                onBeforeInput={(e: React.FormEvent<HTMLTextAreaElement>) =>
                  processBeforeInputData(
                    isLocked,
                    // React types onBeforeInput as a FormEvent; the typed character
                    // only exists on the underlying native InputEvent.
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
          </div>

          {!hasRaceStarted && (
            <div className="absolute right-[38px] top-[120px]">
              <SoloRaceWorldBest onStartRace={startRace} />
            </div>
          )}

          <div className="absolute left-1/2 top-[802px] -translate-x-1/2">
            <SoloRaceKeyboardHints />
          </div>
        </div>
      </div>
    </div>
  );
};
