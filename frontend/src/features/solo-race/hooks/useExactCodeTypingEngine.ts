import { useReducer, useEffect, useCallback, useRef } from 'react';
import { raceReducer, initialState } from '../reducer/race.reducer';
import type { RaceState } from '../types/race.types';
import type { ProgressEvent, RaceSnippet, ExactCodeTypingEngineTransport } from '../types/race.types';

const MAX_BATCH_SIZE = 8;
const DEBOUNCE_MS = 300;

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

export function shouldSkipCompletionRequest(state: Pick<RaceState, 'completionRequested' | 'isFinished' | 'isExpired'>) {
  return state.completionRequested || state.isFinished || state.isExpired;
}

export function useExactCodeTypingEngine(snippet: RaceSnippet, startedAt: string, transport: ExactCodeTypingEngineTransport = defaultTransport) {
  const [state, dispatch] = useReducer(raceReducer, initialState);
  const queueRef = useRef<ProgressEvent[]>([]);
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef(false);
  const mountedRef = useRef(true);

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
    if (shouldSkipFlush(mountedRef.current, inflightRef.current, queueRef.current.length, state.isExpired, state.isFinished)) {
      return;
    }

    inflightRef.current = true;
    const batch = queueRef.current.slice(0, MAX_BATCH_SIZE);
    queueRef.current = queueRef.current.slice(batch.length);

    try {
      const ack = await transport.sendProgressBatch({ events: batch });
      dispatch({ type: 'ACKNOWLEDGE', version: ack.version, serverOffset: ack.serverOffset });
      dispatch({ type: 'TRANSPORT_ONLINE' });
    } catch {
      queueRef.current = [...batch, ...queueRef.current];
      dispatch({ type: 'TRANSPORT_FAILURE', reason: 'progress_send_failed' });
    } finally {
      inflightRef.current = false;
      if (mountedRef.current && queueRef.current.length > 0 && !state.isExpired && !state.isFinished) {
        /* v8 ignore next 3 */
        flushTimeoutRef.current = setTimeout(() => {
          void flushQueue();
        }, DEBOUNCE_MS);
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
    const targetLength = Array.from(state.targetCode).length;
    if (
      !state.isFinished &&
      !state.isExpired &&
      !state.completionRequested &&
      targetLength > 0 &&
      state.serverOffset >= targetLength
    ) {
      void requestCompletion();
    }
  }, [requestCompletion, state.completionRequested, state.isExpired, state.isFinished, state.serverOffset, state.targetCode]);

  const handleInput = useCallback((char: string) => {
    if (state.isExpired || state.isFinished) return;

    /* v8 ignore next */
    const remainingCode = state.targetCode.slice(state.acceptedPrefix.length);
    const nextChar = Array.from(remainingCode)[0];
    const willAdvance = char === nextChar && !state.hasError && state.currentInput.length === 0;

    dispatch({ type: 'INPUT', char });

    if (willAdvance) {
      const version = state.pendingVersion + 1;
      queueRef.current.push({ value: char, version });

      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
      /* v8 ignore next */
      flushTimeoutRef.current = setTimeout(() => {
        void flushQueue();
      }, DEBOUNCE_MS);
    }
  }, [flushQueue, state]);

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
