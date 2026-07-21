import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import {
  loginUser,
  registerUser,
  type LoginCredentials,
  type RegistrationValues,
} from '@/features/auth/auth';
import {
  clearSession,
  isSessionExpired,
  loadSession,
  type AuthSession,
} from '@/features/auth/session';
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage';
import LoginPage from '@/features/auth/pages/LoginPage';
import NotFoundPage from '@/features/auth/pages/NotFoundPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import VerificationPendingPage from '@/features/auth/pages/VerificationPendingPage';
import VerifyEmailPage from '@/features/auth/pages/VerifyEmailPage';
import DashboardPage from '@/features/dashboard/DashboardPage';
import type { SoloSelection } from '@/features/solo/api/soloApi';
import SoloPreviewPage from '@/features/solo/pages/SoloPreviewPage';
import SoloSetupPage from '@/features/solo/pages/SoloSetupPage';

// Loaded lazily so three.js — the 3D mascot's dependency — ships as its own
// chunk and only gets downloaded when someone actually visits the landing page.
const LandingPage = lazy(() => import('@/features/landing/LandingPage'));

type Route =
  | 'admin'
  | 'dashboard'
  | 'forgot'
  | 'landing'
  | 'login'
  | 'notFound'
  | 'pending'
  | 'playSolo'
  | 'register'
  | 'soloPreview'
  | 'soloSetup'
  | 'verify';

type AppState = {
  dashboardNotice?: string;
  loginNotice?: string;
  pendingEmail?: string;
  route: Route;
  session: AuthSession | null;
  soloSelection?: SoloSelection;
};

type RouteResult = Pick<AppState, 'dashboardNotice' | 'loginNotice' | 'route'>;

const LOGIN_REQUIRED_MESSAGE = 'Please log in to continue.';
const ADMIN_REQUIRED_MESSAGE = 'Admin access requires an admin account.';
const SESSION_EXPIRED_MESSAGE = 'Your session expired. Please log in again.';

function routeFromPath(pathname: string): Route {
  switch (pathname) {
    case '/':
      return 'landing';
    case '/register':
      return 'register';
    case '/admin':
      return 'admin';
    case '/dashboard':
      return 'dashboard';
    case '/forgot-password':
      return 'forgot';
    case '/login':
      return 'login';
    case '/not-found':
      return 'notFound';
    case '/solo':
      return 'soloSetup';
    case '/solo/preview':
      return 'soloPreview';
    case '/verify-email-pending':
      return 'pending';
    case '/verify-email':
      return 'verify';
    case '/play/solo':
      return 'playSolo';
    default:
      return 'notFound';
  }
}

function pathFromRoute(route: Route): string {
  switch (route) {
    case 'admin':
      return '/admin';
    case 'dashboard':
      return '/dashboard';
    case 'forgot':
      return '/forgot-password';
    case 'landing':
      return '/';
    case 'login':
      return '/login';
    case 'notFound':
      return '/not-found';
    case 'pending':
      return '/verify-email-pending';
    case 'playSolo':
      return '/play/solo';
    case 'register':
      return '/register';
    case 'soloPreview':
      return '/solo/preview';
    case 'soloSetup':
      return '/solo';
    case 'verify':
      return '/verify-email';
  }
}

function isProtected(route: Route) {
  return (
    route === 'admin' ||
    route === 'dashboard' ||
    route === 'playSolo' ||
    route === 'soloPreview' ||
    route === 'soloSetup'
  );
}

function isAuthRoute(route: Route) {
  return (
    route === 'forgot' ||
    route === 'login' ||
    route === 'pending' ||
    route === 'register'
  );
}

function defaultAuthenticatedRoute(session: AuthSession): Route {
  return session.user.role === 'ADMIN' ? 'admin' : 'dashboard';
}

function resolveRoute(route: Route, session: AuthSession | null): RouteResult {
  if (!session && isProtected(route)) {
    return { loginNotice: LOGIN_REQUIRED_MESSAGE, route: 'login' };
  }

  if (session && route === 'playSolo') {
    // The race lives on the run screen now, so the old standalone path leads there.
    return { route: 'soloPreview' };
  }

  if (session && (route === 'landing' || isAuthRoute(route))) {
    return { route: defaultAuthenticatedRoute(session) };
  }

  if (session && route === 'admin' && session.user.role !== 'ADMIN') {
    return { dashboardNotice: ADMIN_REQUIRED_MESSAGE, route: 'dashboard' };
  }

  return { route };
}

function createInitialState(): AppState {
  const session = loadSession();
  const routeResult = resolveRoute(
    routeFromPath(window.location.pathname),
    session,
  );
  const nextPath = pathFromRoute(routeResult.route);

  if (window.location.pathname !== nextPath) {
    window.history.replaceState(null, '', nextPath);
  }

  return {
    ...routeResult,
    session,
  };
}

export default function App() {
  const [state, setState] = useState<AppState>(createInitialState);
  const {
    dashboardNotice,
    loginNotice,
    pendingEmail,
    route,
    session,
    soloSelection,
  } = state;

  const commitRoute = useCallback(
    (
      requestedRoute: Route,
      nextSession: AuthSession | null,
      replace = false,
      notices: Pick<AppState, 'dashboardNotice' | 'loginNotice'> = {},
    ) => {
      const activeSession =
        nextSession && isSessionExpired(nextSession) ? null : nextSession;
      if (nextSession && !activeSession) {
        clearSession();
      }

      const routeResult = resolveRoute(requestedRoute, activeSession);
      const nextRoute = routeResult.route;
      const nextPath = pathFromRoute(nextRoute);
      const shouldReplace = replace || nextRoute !== requestedRoute;

      if (window.location.pathname !== nextPath) {
        if (shouldReplace) {
          window.history.replaceState(null, '', nextPath);
        } else {
          window.history.pushState(null, '', nextPath);
        }
      }

      setState((current) => ({
        ...current,
        dashboardNotice: notices.dashboardNotice ?? routeResult.dashboardNotice,
        loginNotice: notices.loginNotice ?? routeResult.loginNotice,
        route: nextRoute,
        session: activeSession,
      }));
    },
    [],
  );

  useEffect(() => {
    const handlePopState = () => {
      commitRoute(routeFromPath(window.location.pathname), session, true);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [commitRoute, session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const timeoutId = window.setTimeout(
      () => {
        clearSession();
        commitRoute('login', null, true, {
          loginNotice: SESSION_EXPIRED_MESSAGE,
        });
      },
      Math.max(0, session.expiresAt - Date.now()),
    );

    return () => window.clearTimeout(timeoutId);
  }, [commitRoute, session]);

  const navigate = (nextRoute: Route) => {
    commitRoute(nextRoute, session);
  };

  const handleLogin = async (values: LoginCredentials) => {
    const nextSession = await loginUser(values);
    commitRoute(defaultAuthenticatedRoute(nextSession), nextSession);
  };

  const handleRegister = async (values: RegistrationValues) => {
    const user = await registerUser(values);
    setState((current) => ({ ...current, pendingEmail: user.email }));
    commitRoute('pending', null);
  };

  const handleLogout = () => {
    clearSession();
    commitRoute('login', null, false, {
      loginNotice: 'You have been logged out.',
    });
  };

  const handleVerificationComplete = (notice?: string) => {
    commitRoute('login', null, false, { loginNotice: notice });
  };

  const handleSessionExpired = () => {
    clearSession();
    commitRoute('login', null, true, {
      loginNotice: SESSION_EXPIRED_MESSAGE,
    });
  };

  const handleSelectSolo = (selection: SoloSelection) => {
    setState((current) => ({ ...current, soloSelection: selection }));
    commitRoute('soloPreview', session);
  };

  if (session && (route === 'admin' || route === 'dashboard')) {
    return (
      <DashboardPage
        notice={dashboardNotice}
        onGoAdmin={() => navigate('admin')}
        onGoDashboard={() => navigate('dashboard')}
        onLogout={handleLogout}
        onPlaySolo={() => navigate('soloSetup')}
        session={session}
        view={route === 'admin' ? 'admin' : 'dashboard'}
      />
    );
  }

  if (session && route === 'soloSetup') {
    return (
      <SoloSetupPage
        onGoDashboard={() => navigate('dashboard')}
        onLogout={handleLogout}
        onSelect={handleSelectSolo}
        onSessionExpired={handleSessionExpired}
        session={session}
      />
    );
  }

  if (session && route === 'soloPreview') {
    if (!soloSelection) {
      return (
        <SoloSetupPage
          onGoDashboard={() => navigate('dashboard')}
          onLogout={handleLogout}
          onSelect={handleSelectSolo}
          onSessionExpired={handleSessionExpired}
          session={session}
        />
      );
    }
    return (
      <SoloPreviewPage
        onExitRace={() => navigate('dashboard')}
        onSessionExpired={handleSessionExpired}
        selection={soloSelection}
      />
    );
  }

  if (route === 'forgot') {
    return <ForgotPasswordPage onBackToLogin={() => navigate('login')} />;
  }

  if (route === 'login') {
    return (
      <LoginPage
        notice={loginNotice}
        onCreateAccount={() => navigate('register')}
        onForgotPassword={() => navigate('forgot')}
        onLogin={handleLogin}
      />
    );
  }

  if (route === 'pending') {
    return (
      <VerificationPendingPage
        email={pendingEmail}
        onBackToLogin={() => navigate('login')}
      />
    );
  }

  if (route === 'verify') {
    return (
      <VerifyEmailPage
        onBackToLogin={handleVerificationComplete}
        token={new URLSearchParams(window.location.search).get('token')}
      />
    );
  }

  if (route === 'notFound') {
    return (
      <NotFoundPage
        onGoHome={() =>
          navigate(session ? defaultAuthenticatedRoute(session) : 'landing')
        }
      />
    );
  }

  if (route === 'register') {
    return (
      <RegisterPage
        onRegister={handleRegister}
        onSignIn={() => navigate('login')}
      />
    );
  }

  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-surface" />}>
      <LandingPage onPlay={() => navigate('register')} />
    </Suspense>
  );
}
