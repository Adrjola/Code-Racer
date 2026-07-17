import { useState, useEffect } from 'react';

export function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!targetDate) return;

    const target = new Date(targetDate).getTime();

    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((target - now) / 1000));
      setTimeLeft(diff);
    };

    update();
    const timer = setInterval(update, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
}
