import { useReducer, useEffect, useCallback, useRef } from 'react';
import { raceReducer, initialState } from '../reducer/race.reducer';
import type { RaceState } from '../types/race.types';
import type {
  ProgressEvent,
  RaceSnippet,
  ExactCodeTypingEngineTransport,
} from '../types/race.types';
import { codePointLength } from '../utils/codePointText';
import { ApiRequestError } from '@/lib/apiClient';

const MAX_BATCH_SIZE = 8;
const DEBOUNCE_MS = 300;

/**
 * Consecutive *rejected* sends before the race gives up. A rejected batch is
 * retried unchanged, so without a ceiling one permanent rejection loops forever,
 * floods the console, and leaves the attempt to expire while the player keeps
 * typing.
 */
const MAX_CONSECUTIVE_FAILURES = 4;

/**
 * A server that cannot be reached is a different problem from one that says no:
 * the batch is still valid and will be accepted once the server is back. Four
 * failures at the debounce interval gave up after about a second, which was
 * shorter than a backend restart, so a race the server would have honoured died
 * on the client. Retries back off instead, and only give up once the server-side
 * idle TTL would have expired the attempt anyway.
 */
const MAX_UNREACHABLE_MS = 60_000;
const MAX_RETRY_DELAY_MS = 5_000;

function isUnreachable(error: unknown): boolean {
  if (!(error instanceof ApiRequestError)) {
    return false;
  }
  return error.code === 'NETWORK_ERROR' || (error.status ?? 0) >= 500;
}

export const defaultTransport: ExactCodeTypingEngineTransport = {
  async sendProgressBatch(batch) {
    const last = batch.events[batch.events.length - 1];
    return {
      version: last.version,
      serverOffset: last.version,
    };
  },
  async submitCompletion() {
    return;
  },
};

export function shouldSkipFlush(
  mounted: boolean,
  inflight: boolean,
  queueLength: number,
  isExpired: boolean,
  isFinished: boolean,
) {
  return !mounted || inflight || queueLength === 0 || isExpired || isFinished;
}

export function shouldSkipCompletionRequest(
  state: Pick<RaceState, 'completionRequested' | 'isFinished' | 'isExpired'>,
) {
  return state.completionRequested || state.isFinished || state.isExpired;
}

export function useExactCodeTypingEngine(
  snippet: RaceSnippet,
  startedAt: string,
  transport: ExactCodeTypingEngineTransport = defaultTransport,
) {
  const [state, dispatch] = useReducer(raceReducer, initialState);
  const queueRef = useRef<ProgressEvent[]>([]);
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef(false);
  const mountedRef = useRef(true);
  const failureCountRef = useRef(0);
  const unreachableSinceRef = useRef<number | null>(null);
  const retryDelayRef = useRef(DEBOUNCE_MS);
  const queuedLengthRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }
      queueRef.current = [];
      inflightRef.current = false;
    };
  }, []);

  useEffect(() => {
    dispatch({ type: 'SET_RACE', snippet, startedAt });
  }, [snippet, startedAt]);

  const flushQueue = useCallback(async () => {
    if (
      shouldSkipFlush(
        mountedRef.current,
        inflightRef.current,
        queueRef.current.length,
        state.isExpired,
        state.isFinished,
      )
    ) {
      return;
    }

    inflightRef.current = true;
    const batch = queueRef.current.slice(0, MAX_BATCH_SIZE);
    queueRef.current = queueRef.current.slice(batch.length);

    try {
      const ack = await transport.sendProgressBatch({ events: batch });
      dispatch({
        type: 'ACKNOWLEDGE',
        version: ack.version,
        serverOffset: ack.serverOffset,
      });
      if (ack.completed) {
        dispatch({ type: 'FINISH', result: ack.result });
      }
      failureCountRef.current = 0;
      unreachableSinceRef.current = null;
      retryDelayRef.current = DEBOUNCE_MS;
      dispatch({ type: 'TRANSPORT_ONLINE' });
    } catch (error) {
      const giveUp = () => {
        queueRef.current = [];
        dispatch({ type: 'EXPIRE' });
        dispatch({ type: 'TRANSPORT_FAILURE', reason: 'progress_send_failed' });
      };

      if (isUnreachable(error)) {
        const since = unreachableSinceRef.current ?? Date.now();
        unreachableSinceRef.current = since;
        if (Date.now() - since >= MAX_UNREACHABLE_MS) {
          giveUp();
          return;
        }
        retryDelayRef.current = Math.min(
          retryDelayRef.current * 2,
          MAX_RETRY_DELAY_MS,
        );
      } else {
        failureCountRef.current += 1;
        if (failureCountRef.current >= MAX_CONSECUTIVE_FAILURES) {
          giveUp();
          return;
        }
      }

      queueRef.current = [...batch, ...queueRef.current];
      dispatch({ type: 'TRANSPORT_FAILURE', reason: 'progress_send_failed' });
    } finally {
      inflightRef.current = false;
      if (
        mountedRef.current &&
        queueRef.current.length > 0 &&
        !state.isExpired &&
        !state.isFinished
      ) {
        /* v8 ignore next 3 */
        flushTimeoutRef.current = setTimeout(() => {
          void flushQueue();
        }, retryDelayRef.current);
      }
    }
  }, [state, transport]);

  const requestCompletion = useCallback(async () => {
    /* v8 ignore next */
    if (shouldSkipCompletionRequest(state)) {
      /* v8 ignore next */
      return;
    }

    dispatch({ type: 'REQUEST_COMPLETION' });
    try {
      await transport.submitCompletion({ version: state.ackedVersion });
      dispatch({ type: 'FINISH' });
    } catch {
      dispatch({ type: 'TRANSPORT_FAILURE', reason: 'completion_send_failed' });
    }
  }, [state, transport]);

  useEffect(() => {
    const targetLength = codePointLength(state.targetCode);
    if (
      !state.isFinished &&
      !state.isExpired &&
      !state.completionRequested &&
      targetLength > 0 &&
      state.serverOffset >= targetLength
    ) {
      void requestCompletion();
    }
  }, [
    requestCompletion,
    state.completionRequested,
    state.isExpired,
    state.isFinished,
    state.serverOffset,
    state.targetCode,
  ]);

  const handleInput = useCallback((char: string) => {
    dispatch({ type: 'INPUT', char });
  }, []);

  // Queue whatever the reducer actually accepted rather than predicting it.
  // Predicting duplicated the acceptance rule, and any disagreement sent the
  // server characters it never agreed to, which it rejects as a mismatch.
  useEffect(() => {
    const acceptedLength = codePointLength(state.acceptedPrefix);

    if (acceptedLength < queuedLengthRef.current) {
      queuedLengthRef.current = acceptedLength;
      return;
    }
    if (acceptedLength === queuedLengthRef.current) {
      return;
    }

    const accepted = Array.from(state.acceptedPrefix);
    for (let index = queuedLengthRef.current; index < acceptedLength; index++) {
      queueRef.current.push({ value: accepted[index], version: index + 1 });
    }
    queuedLengthRef.current = acceptedLength;

    if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
    flushTimeoutRef.current = setTimeout(() => {
      void flushQueue();
    }, DEBOUNCE_MS);
  }, [flushQueue, state.acceptedPrefix]);

  const handleDelete = useCallback(() => {
    dispatch({ type: 'DELETE' });
  }, []);

  const markExpired = useCallback(() => {
    dispatch({ type: 'EXPIRE' });
  }, []);

  return {
    state,
    handleInput,
    handleDelete,
    markExpired,
    flushNow: flushQueue,
  };
}
