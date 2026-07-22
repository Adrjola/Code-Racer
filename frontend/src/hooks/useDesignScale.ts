import { useEffect, useState } from 'react';

export function useDesignScale(designWidth: number) {
  const [scale, setScale] = useState(() =>
    Math.min(1, window.innerWidth / designWidth),
  );

  useEffect(() => {
    const update = () => setScale(Math.min(1, window.innerWidth / designWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [designWidth]);

  return scale;
}
