import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from '@/app/App';

const DESIGN_HEIGHT = 1080;
const DESIGN_WIDTH = 1920;

/**
 * Two scales, because pages fit their 1920x1080 canvas in two different ways.
 * --canvas-scale matches the width and lets the page grow taller than the
 * screen; --fit-scale also respects the height, for pages that must never
 * scroll. Keep them in sync with useDesignScale, which computes the same thing
 * for components that scale on their own.
 */
function updateLayoutScale() {
  const canvasScale = window.innerWidth / DESIGN_WIDTH;
  const fitScale = Math.min(canvasScale, window.innerHeight / DESIGN_HEIGHT);

  document.documentElement.style.setProperty(
    '--canvas-scale',
    `${canvasScale}`,
  );
  document.documentElement.style.setProperty('--fit-scale', `${fitScale}`);
}

updateLayoutScale();
window.addEventListener('resize', updateLayoutScale);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
