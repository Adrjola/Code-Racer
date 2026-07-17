import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from '@/app/App';

const DESIGN_HEIGHT = 1080;
const DESIGN_WIDTH = 1920;

function updateLayoutScale() {
  const scale = Math.min(
    window.innerWidth / DESIGN_WIDTH,
    window.innerHeight / DESIGN_HEIGHT,
  );
  const loginScale = window.innerWidth / DESIGN_WIDTH;
  const authCenterX = window.innerWidth / (2 * scale);
  const loginCenterX = window.innerWidth / (2 * loginScale);

  document.documentElement.style.setProperty('--auth-scale', `${scale}`);
  document.documentElement.style.setProperty(
    '--auth-center-x',
    `${authCenterX}px`,
  );
  document.documentElement.style.setProperty(
    '--auth-login-scale',
    `${loginScale}`,
  );
  document.documentElement.style.setProperty(
    '--auth-login-center-x',
    `${loginCenterX}px`,
  );
  document.documentElement.style.setProperty('--page-scale', `${scale}`);
}

updateLayoutScale();
window.addEventListener('resize', updateLayoutScale);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
