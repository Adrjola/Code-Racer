import { useState, useEffect } from 'react';

/**
 * How far the browser's clock sits from the server's, in milliseconds. A machine
 * whose clock is behind would otherwise count down from the difference: a browser
 * 27 seconds slow showed a 30 second countdown for a 3 second race start, and
 * stayed locked out while the server was already timing the run.
 */
export function clockSkewMs(serverTime: string, receivedAt: number): number {
  const server = new Date(serverTime).getTime();
  return Number.isFinite(server) ? server - receivedAt : 0;
}

function secondsUntil(target: number, now: number): number {
  return Math.max(0, Math.ceil((target - now) / 1000));
}

export function useCountdown(targetDate: string | null, skewMs = 0) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!targetDate) {
      return;
    }

    // Each refresh is scheduled onto the target's own second boundary rather
    // than a free-running interval. A fixed 1000ms tick starts whenever this
    // effect happened to run, so the countdown could reach zero up to a second
    // after the race had actually started - and the typing field stays locked
    // until it does.
    const target = new Date(targetDate).getTime() - skewMs;
    let timer: ReturnType<typeof setTimeout>;

    const refresh = () => {
      setNow(Date.now());
      const untilNextBoundary = (target - Date.now()) % 1000;
      timer = setTimeout(
        refresh,
        untilNextBoundary > 0 ? untilNextBoundary : 1000,
      );
    };
    refresh();

    return () => {
      clearTimeout(timer);
    };
  }, [targetDate, skewMs]);

  if (!targetDate) {
    return null;
  }

  return secondsUntil(new Date(targetDate).getTime() - skewMs, now);
}
