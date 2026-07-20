import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from '@/app/App';

const AUTH_DESIGN_HEIGHT = 1080;
const AUTH_DESIGN_WIDTH = 1920;

function updateAuthScale() {
  const scale = Math.min(
    window.innerWidth / AUTH_DESIGN_WIDTH,
    window.innerHeight / AUTH_DESIGN_HEIGHT,
  );
  const loginScale = window.innerWidth / AUTH_DESIGN_WIDTH;
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
}

updateAuthScale();
window.addEventListener('resize', updateAuthScale);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
