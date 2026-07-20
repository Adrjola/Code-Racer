import { useEffect, useState } from 'react';

export type CountdownState =
  | { secondsRemaining: null; status: 'idle' }
  | { secondsRemaining: number; status: 'counting' }
  | { secondsRemaining: 0; status: 'elapsed' };

const TICK_MS = 200;

/**
 * Counts down to a server-provided `startedAt` instant. The returned state is
 * always recomputed from `Date.now()` at render time rather than decremented,
 * so it always reflects the authoritative server time and can never drift
 * into a client-invented start time. A self-rescheduling timeout just forces
 * re-renders (via `tick`) until the countdown elapses; it never sets state
 * synchronously, only from within its own callback.
 */
export function useServerCountdown(startedAt: string | null): CountdownState {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!startedAt || computeState(startedAt).status === 'elapsed') {
      return;
    }

    let timeoutId: number;
    const scheduleNext = () => {
      timeoutId = window.setTimeout(() => {
        setTick((count) => count + 1);
        if (computeState(startedAt).status !== 'elapsed') {
          scheduleNext();
        }
      }, TICK_MS);
    };
    scheduleNext();

    return () => window.clearTimeout(timeoutId);
  }, [startedAt]);

  return computeState(startedAt);
}

function computeState(startedAt: string | null): CountdownState {
  if (!startedAt) {
    return { secondsRemaining: null, status: 'idle' };
  }

  const remainingMs = new Date(startedAt).getTime() - Date.now();
  if (remainingMs <= 0) {
    return { secondsRemaining: 0, status: 'elapsed' };
  }

  return {
    secondsRemaining: Math.ceil(remainingMs / 1000),
    status: 'counting',
  };
}
