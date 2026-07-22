import { useEffect, useState } from 'react';

function computeScale(designWidth: number, designHeight?: number) {
  const widthScale = window.innerWidth / designWidth;
  const heightScale = designHeight
    ? window.innerHeight / designHeight
    : Infinity;
  return Math.min(1, widthScale, heightScale);
}

export function useDesignScale(designWidth: number, designHeight?: number) {
  const [scale, setScale] = useState(() =>
    computeScale(designWidth, designHeight),
  );

  useEffect(() => {
    const update = () => setScale(computeScale(designWidth, designHeight));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [designWidth, designHeight]);

  return scale;
}
