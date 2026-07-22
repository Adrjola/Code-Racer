import { useEffect, useState } from 'react';

function computeScale(designWidth: number, designHeight?: number) {
  const widthScale = window.innerWidth / designWidth;
  const heightScale = designHeight
    ? window.innerHeight / designHeight
    : Infinity;
  // Deliberately uncapped: the header and the auth/landing canvases all grow
  // past 1 on wide monitors, and capping here made the same logo render at two
  // different sizes depending on which page you were on.
  return Math.min(widthScale, heightScale);
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
