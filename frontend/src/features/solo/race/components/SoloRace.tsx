import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type SyntheticEvent,
} from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
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
  onNewSnippet?: () => void | Promise<void>;
  onRestartRace?: () => void | Promise<void>;
  onStartRace?: () => void | Promise<void>;
  snippet: RaceSnippet;
  startedAt: string;
  transport?: ExactCodeTypingEngineTransport;
}

export function SoloRace({
  errorMessage,
  onLobbyNavigate,
  onNewSnippet,
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
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);

  const countdown = useCountdown(
    hasRaceStarted && startedAt ? startedAt : null,
  );
  const isCountdownActive = countdown !== null && countdown > 0;
  const raceStartedAtMs =
    hasRaceStarted && startedAt ? Date.parse(startedAt) : null;
  const isLocked =
    !hasRaceStarted || !startedAt || isCountdownActive || isLeaveConfirmOpen;

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

  const leaveToLobby = async () => {
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

  // Leaving mid-race abandons the attempt, so a stray Escape asks first. A race
  // that has not started or has already finished has nothing to lose.
  const isRaceInProgress = hasRaceStarted && !state.isFinished;

  const goToLobby = () => {
    if (isRaceInProgress) {
      setIsLeaveConfirmOpen(true);
      return;
    }
    void leaveToLobby();
  };

  const cancelLeave = () => {
    setIsLeaveConfirmOpen(false);
  };

  const confirmLeave = () => {
    setIsLeaveConfirmOpen(false);
    void leaveToLobby();
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

  const loadNewSnippet = async () => {
    if (isBootstrappingRace || !onNewSnippet) {
      return;
    }

    setIsBootstrappingRace(true);
    try {
      await onNewSnippet();
    } finally {
      setIsBootstrappingRace(false);
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

  // Enter is the fastest way back into a race after finishing one, but it must
  // not fire once the race is running, where Enter is a typed character.
  const startRaceRef = useRef(startRace);
  useEffect(() => {
    startRaceRef.current = startRace;
  });

  const canStartWithEnter =
    !hasRaceStarted && !isBootstrappingRace && !isLeaveConfirmOpen;

  useEffect(() => {
    if (!canStartWithEnter) {
      return;
    }

    const handleWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      if (
        event.key !== 'Enter' ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      void startRaceRef.current();
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [canStartWithEnter]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isLocked) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      // The confirmation dialog closes itself on Escape from a window listener.
      // Without this the keypress that opens it also reaches that listener and
      // shuts it again in the same tick, so the dialog never appears.
      event.stopPropagation();
      goToLobby();
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

  // A race the engine gave up on accepts no more input, so say so rather than
  // leaving the player typing into a screen that silently ignores them.
  const stoppedMessage = state.isExpired
    ? 'Lost contact with the server, so this race was stopped. Restart to try again.'
    : null;
  const noticeMessage = errorMessage ?? stoppedMessage;

  // The code block is taller than its card on long snippets. Once the cursor
  // passes the middle, the block slides up so what comes next stays visible.
  const codeViewportRef = useRef<HTMLDivElement>(null);
  const codeContentRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const [codeOffset, setCodeOffset] = useState(0);

  useLayoutEffect(() => {
    const viewport = codeViewportRef.current;
    const content = codeContentRef.current;
    const cursor = cursorRef.current;
    if (!viewport || !content || !cursor) {
      return;
    }

    const viewportHeight = viewport.clientHeight;
    if (viewportHeight === 0) {
      return;
    }

    // offsetTop is layout based, so it is unaffected by the transform that is
    // animating underneath it and stays correct mid-transition.
    const furthestOffset = Math.max(0, content.offsetHeight - viewportHeight);
    const desiredOffset = cursor.offsetTop - viewportHeight / 2;
    setCodeOffset(Math.min(furthestOffset, Math.max(0, desiredOffset)));
  }, [state.acceptedPrefix, state.currentInput, state.targetCode]);

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
    // Wrong keystrokes mark the characters they should have been, rather than
    // being inserted alongside them. The snippet is always rendered exactly
    // once, so nothing shifts as mistakes are made and deleted.
    const remaining = Array.from(
      sliceCodePoints(targetCode, codePointLength(acceptedPrefix)),
    );
    const mistakeCount = codePointLength(currentInput);
    const missedPart = remaining.slice(0, mistakeCount).join('');
    const rest = remaining.slice(mistakeCount).join('');

    return (
      <pre
        className={`whitespace-pre-wrap break-all font-mono text-sm leading-relaxed transition duration-200 select-none sm:text-base lg:text-lg ${
          isLocked ? 'blur-[2px]' : ''
        }`}
      >
        <span className="text-slate-100">{acceptedPrefix}</span>
        {/* Sits before the highlight so it marks where the mistake happened.
            A missed newline highlights nothing visible, so this caret is the
            only thing showing an error at the end of a line. */}
        <span
          className={`inline-block h-[1.15em] translate-y-[0.2em] ${
            isLocked
              ? 'w-0'
              : mistakeCount
                ? 'w-[3px] bg-rose-400'
                : 'w-[2px] animate-pulse bg-emerald-400'
          }`}
          data-error={mistakeCount > 0 ? 'true' : undefined}
          data-testid="race-caret"
          ref={cursorRef}
        />
        {missedPart && (
          <span className="bg-rose-500/30 text-rose-300 underline decoration-rose-400">
            {missedPart}
          </span>
        )}
        <span className="text-slate-200/40">{rest}</span>
      </pre>
    );
  };

  return (
    <div className="min-h-screen w-full bg-[#08051A] text-slate-50 lg:flex lg:h-[100dvh] lg:min-h-0 lg:flex-col lg:overflow-hidden">
      <SoloRaceHeader
        actionLabel={hasRaceStarted ? 'Restart' : 'New snippet'}
        onAction={hasRaceStarted ? restartRace : loadNewSnippet}
        onLobby={goToLobby}
      />

      {isLeaveConfirmOpen && (
        <ConfirmDialog
          confirmLabel="Leave race"
          confirmVariant="secondary"
          description="This race will be abandoned and the time will not count."
          onCancel={cancelLeave}
          onConfirm={confirmLeave}
          title="Leave the race?"
        />
      )}

      <div
        className="mx-auto mt-6 w-full max-w-[1920px] px-4 sm:px-6 lg:mt-10 lg:min-h-0 lg:flex-1"
        onClick={focusInput}
      >
        <div className="flex flex-col items-center gap-6 lg:relative lg:block lg:h-full lg:gap-0">
          <div className="w-full max-w-[868.63px] lg:absolute lg:left-1/2 lg:top-[37px] lg:-translate-x-1/2">
            <SoloRaceStatsRow
              cpm={cpm}
              currentLine={line}
              elapsed={elapsed}
              progressPercent={progressPercent}
              totalLines={totalLines}
            />
          </div>

          <div className="w-full max-w-[868.63px] lg:absolute lg:left-1/2 lg:top-[125px] lg:-translate-x-1/2">
            <div
              className="relative min-h-[360px] overflow-hidden rounded-2xl border border-[#2D2544] bg-[#0E0A1F] p-5 sm:p-8 lg:h-[667px] lg:min-h-0"
              style={{
                boxShadow: '0px 30px 80px -20px rgba(219, 39, 119, 0.7)',
              }}
            >
              <div className="h-full overflow-hidden" ref={codeViewportRef}>
                <div
                  className="relative transition-transform duration-200 ease-out"
                  ref={codeContentRef}
                  style={{ transform: `translateY(-${codeOffset}px)` }}
                >
                  {renderCode()}
                </div>
              </div>

              {noticeMessage ? (
                <div
                  className="pointer-events-none absolute inset-x-8 top-8 z-10 rounded-lg border border-rose-300/50 bg-rose-500/15 px-4 py-3 text-sm text-rose-100"
                  role="alert"
                >
                  {noticeMessage}
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
                onBlur={() => {
                  // A click anywhere else silently stops typing from landing,
                  // so an active race takes its focus straight back.
                  if (isLocked) {
                    return;
                  }
                  window.setTimeout(() => inputRef.current?.focus(), 0);
                }}
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
            <div className="w-full max-w-[440px] lg:absolute lg:right-[38px] lg:top-[120px] lg:w-auto">
              <SoloRaceWorldBest
                onStartRace={startRace}
                snippetId={snippet.id}
              />
            </div>
          )}

          <div className="w-full lg:absolute lg:bottom-[18px] lg:left-1/2 lg:w-auto lg:-translate-x-1/2">
            <SoloRaceKeyboardHints />
          </div>
        </div>
      </div>
    </div>
  );
}
