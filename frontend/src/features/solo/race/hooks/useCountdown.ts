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

    const refresh = () => {
      setNow(Date.now());
    };
    const initialTimer = setTimeout(refresh, 0);
    const intervalTimer = setInterval(refresh, 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [targetDate]);

  return targetDate ? secondsUntil(targetDate, now) : null;
}
