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
  const [isBootstrappingRace, setIsBootstrappingRace] = useState(false);

  // The server's startedAt is the only start time. Deriving it means the clock
  // and the lock can never disagree with the countdown the player sees.
  const raceStartedAtMs =
    hasRaceStarted && startedAt ? Date.parse(startedAt) : null;

  // Without a server startedAt there is no attempt to record progress against,
  // so typing stays locked even if a start was requested.
  const isLocked =
    !hasRaceStarted || !startedAt || (countdown !== null && countdown > 0);

  const focusInput = () => {
    /* v8 ignore next */
    if (!isLocked) {
      inputRef.current?.focus();
    }
  };

  // Focuses inline rather than calling focusInput, which is rebuilt every render
  // and would make this effect re-run on each one.
  useEffect(() => {
    if (!isLocked) {
      inputRef.current?.focus();
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

  // Loading a different snippet returns the screen to its pre-race state. This
  // is React's documented "adjust state when a prop changes" pattern: it runs
  // during render rather than in an effect, so there is no extra render pass.
  const [renderedSnippetId, setRenderedSnippetId] = useState(snippet.id);
  if (renderedSnippetId !== snippet.id) {
    setRenderedSnippetId(snippet.id);
    setHasRaceStarted(false);
    setFinishedElapsedSeconds(null);
    // nowMs is deliberately left alone: with the race not started the elapsed
    // time reads 0 anyway, and Date.now() cannot be called during render.
  }

  const terminateRaceToMenu = () => {
    setHasRaceStarted(false);
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

  // Restart drops back to the pre-start screen (the snippet preview with the
  // Start button) rather than immediately racing again, so the flow matches
  // "start race" from a standstill every time.
  const restartRace = async () => {
    if (isBootstrappingRace) return;

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
      } catch {
        setHasRaceStarted(false);
      } finally {
        setIsBootstrappingRace(false);
      }
      return;
    }

    setHasRaceStarted(true);
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
        className={`font-mono text-sm sm:text-base lg:text-lg leading-relaxed whitespace-pre-wrap break-all select-none transition duration-200 ${
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
            <span className="inline-block h-[1.15em] w-[2px] translate-y-[0.2em] bg-emerald-400 animate-pulse" />
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
        className="mx-auto mt-6 w-full max-w-[1920px] px-4 sm:px-6 lg:mt-10"
        onClick={focusInput}
      >
        {/* Stacks in flow on small screens; the fixed desktop composition only
            applies from lg up, where there is room for it. */}
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

              {hasRaceStarted && countdown !== null && countdown > 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-8xl font-extrabold leading-none text-[#FDE68A] drop-shadow-[0_0_24px_rgba(244,114,182,0.55)]">
                    {countdown}
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
                onBeforeInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                  // Read the character from React's synthetic event, not from
                  // e.nativeEvent. React normalises it here for every input
                  // path, and the spacebar in particular is synthesised from a
                  // keypress whose native KeyboardEvent carries no data at all.
                  const { data } = e as React.FormEvent<HTMLTextAreaElement> & {
                    data?: string | null;
                  };
                  processBeforeInputData(isLocked, data, handleInput, () =>
                    e.preventDefault(),
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
};
