import { useState, useEffect } from 'react';

function secondsUntil(targetDate: string, now: number): number {
  const target = new Date(targetDate).getTime();
  return Math.max(0, Math.ceil((target - now) / 1000));
}

export function useCountdown(targetDate: string | null) {
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
    const target = new Date(targetDate).getTime();
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
  }, [targetDate]);

  return targetDate ? secondsUntil(targetDate, now) : null;
}
