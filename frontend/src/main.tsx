import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from '@/app/App';

const DESIGN_HEIGHT = 1080;
const DESIGN_WIDTH = 1920;

function updateLayoutScale() {
  const scale = Math.min(
    window.innerWidth / DESIGN_WIDTH,
    window.innerHeight / DESIGN_HEIGHT,
  );
  const authScale = window.innerWidth / DESIGN_WIDTH;
  const landingScale = authScale;

  document.documentElement.style.setProperty('--auth-scale', `${authScale}`);
  document.documentElement.style.setProperty(
    '--auth-login-scale',
    `${authScale}`,
  );
  document.documentElement.style.setProperty(
    '--landing-scale',
    `${landingScale}`,
  );
  document.documentElement.style.setProperty('--page-scale', `${scale}`);
  document.documentElement.style.setProperty('--stats-scale', `${authScale}`);
}

updateLayoutScale();
window.addEventListener('resize', updateLayoutScale);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
