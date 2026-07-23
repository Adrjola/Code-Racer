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
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage';
import VerificationPendingPage from '@/features/auth/pages/VerificationPendingPage';
import VerifyEmailPage from '@/features/auth/pages/VerifyEmailPage';
import HomePage from '@/features/home/HomePage';
import Toast from '@/components/Toast';
import type { SoloSelection } from '@/features/solo/api/soloApi';
import SoloPreviewPage from '@/features/solo/pages/SoloPreviewPage';
import SoloSetupPage from '@/features/solo/pages/SoloSetupPage';
import StatisticsPage from '@/features/statistics/pages/StatisticsPage';

// Loaded lazily so three.js — the 3D mascot's dependency — ships as its own
// chunk and only gets downloaded when someone actually visits the landing page.
const LandingPage = lazy(() => import('@/features/landing/LandingPage'));

type Route =
  | 'admin'
  | 'forgot'
  | 'home'
  | 'landing'
  | 'login'
  | 'notFound'
  | 'pending'
  | 'playSolo'
  | 'register'
  | 'resetPassword'
  | 'soloPreview'
  | 'soloSetup'
  | 'statistics'
  | 'verify';

type AppState = {
  homeNotice?: string;
  loginNotice?: string;
  pendingEmail?: string;
  route: Route;
  session: AuthSession | null;
  soloSelection?: SoloSelection;
};

type RouteResult = Pick<AppState, 'homeNotice' | 'loginNotice' | 'route'>;

const LOGIN_REQUIRED_MESSAGE = 'Please log in to continue.';
const ADMIN_REQUIRED_MESSAGE = 'Admin access requires an admin account.';
const SESSION_EXPIRED_MESSAGE = 'Your session expired. Please log in again.';

function routeFromPath(pathname: string): Route {
  switch (pathname) {
    case '/':
      return 'landing';
    case '/register':
      return 'register';
    case '/reset-password':
      return 'resetPassword';
    case '/admin':
      return 'admin';
    case '/home':
      return 'home';
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
    case '/statistics':
      return 'statistics';
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
    case 'forgot':
      return '/forgot-password';
    case 'home':
      return '/home';
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
    case 'resetPassword':
      return '/reset-password';
    case 'soloPreview':
      return '/solo/preview';
    case 'soloSetup':
      return '/solo';
    case 'statistics':
      return '/statistics';
    case 'verify':
      return '/verify-email';
  }
}

function isProtected(route: Route) {
  return (
    route === 'admin' ||
    route === 'home' ||
    route === 'playSolo' ||
    route === 'soloPreview' ||
    route === 'soloSetup' ||
    route === 'statistics'
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
  return session.user.role === 'ADMIN' ? 'admin' : 'home';
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
    return { homeNotice: ADMIN_REQUIRED_MESSAGE, route: 'home' };
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
  const [soloNotice, setSoloNotice] = useState<string | null>(null);
  const {
    homeNotice,
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
      notices: Pick<AppState, 'homeNotice' | 'loginNotice'> = {},
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
        homeNotice: notices.homeNotice ?? routeResult.homeNotice,
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
    // Logging out drops you where a signed-out visitor belongs, not on a form
    // asking you to sign back in.
    commitRoute('landing', null, false);
  };

  const handleVerificationComplete = (notice?: string) => {
    commitRoute('login', null, false, { loginNotice: notice });
  };

  const handlePasswordResetComplete = (notice?: string) => {
    commitRoute('login', null, false, { loginNotice: notice });
  };

  const handleSessionExpired = () => {
    clearSession();
    commitRoute('login', null, true, {
      loginNotice: SESSION_EXPIRED_MESSAGE,
    });
  };

  const handleSelectSolo = (selection: SoloSelection) => {
    setSoloNotice(null);
    setState((current) => ({ ...current, soloSelection: selection }));
    commitRoute('soloPreview', session);
  };

  // The preview has nothing to show without a snippet, so the picker says why.
  const handleNoSnippets = useCallback(
    (message: string) => {
      setSoloNotice(message);
      commitRoute('soloSetup', session);
    },
    [commitRoute, session],
  );

  if (session && (route === 'admin' || route === 'home')) {
    return (
      <HomePage
        notice={homeNotice}
        onGoAdmin={() => navigate('admin')}
        onGoHome={() => navigate('home')}
        onGoStatistics={() => navigate('statistics')}
        onLogout={handleLogout}
        onPlaySolo={() => navigate('soloSetup')}
        session={session}
        view={route === 'admin' ? 'admin' : 'home'}
      />
    );
  }

  if (session && route === 'statistics') {
    return (
      <StatisticsPage
        onGoHome={() => navigate('home')}
        onGoStatistics={() => navigate('statistics')}
        onLogout={handleLogout}
        onSessionExpired={handleSessionExpired}
        session={session}
      />
    );
  }

  if (session && route === 'soloSetup') {
    return (
      <>
        {soloNotice && (
          <Toast message={soloNotice} onDismiss={() => setSoloNotice(null)} />
        )}
        <SoloSetupPage
          onGoHome={() => navigate('home')}
          onGoStatistics={() => navigate('statistics')}
          onLogout={handleLogout}
          onSelect={handleSelectSolo}
          onSessionExpired={handleSessionExpired}
          session={session}
        />
      </>
    );
  }

  if (session && route === 'soloPreview') {
    if (!soloSelection) {
      return (
        <SoloSetupPage
          onGoHome={() => navigate('home')}
          onGoStatistics={() => navigate('statistics')}
          onLogout={handleLogout}
          onSelect={handleSelectSolo}
          onSessionExpired={handleSessionExpired}
          session={session}
        />
      );
    }
    return (
      <SoloPreviewPage
        onExitRace={() => navigate('home')}
        onNoSnippets={handleNoSnippets}
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

  if (route === 'resetPassword') {
    return (
      <ResetPasswordPage
        onBackToLogin={handlePasswordResetComplete}
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
