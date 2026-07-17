import { useCallback, useEffect, useState } from 'react';
import {
  clearSession,
  isSessionExpired,
  loadSession,
  loginUser,
  registerUser,
  type AuthSession,
  type LoginCredentials,
  type RegistrationValues,
} from '@/features/auth/auth';
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage';
import LoginPage from '@/features/auth/pages/LoginPage';
import NotFoundPage from '@/features/auth/pages/NotFoundPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import VerificationPendingPage from '@/features/auth/pages/VerificationPendingPage';
import VerifyEmailPage from '@/features/auth/pages/VerifyEmailPage';
import DashboardPage from '@/features/dashboard/DashboardPage';
import LobbyPage from '@/features/lobby/components/LobbyPage';
import { SoloRace } from '@/features/solo-race/components/SoloRace';
import { useSoloRaceSession } from '@/features/solo-race/hooks/useSoloRaceSession';
import type { RaceSnippet } from '@/features/solo-race/types/race.types';

type Route =
  | 'admin'
  | 'dashboard'
  | 'forgot'
  | 'lobby'
  | 'login'
  | 'notFound'
  | 'pending'
  | 'playSolo'
  | 'register'
  | 'verify';

type AppState = {
  dashboardNotice?: string;
  loginNotice?: string;
  pendingEmail?: string;
  route: Route;
  session: AuthSession | null;
};

type RouteResult = Pick<AppState, 'dashboardNotice' | 'loginNotice' | 'route'>;

const LOGIN_REQUIRED_MESSAGE = 'Please log in to continue.';
const ADMIN_REQUIRED_MESSAGE = 'Admin access requires an admin account.';
const SESSION_EXPIRED_MESSAGE = 'Your session expired. Please log in again.';

function routeFromPath(pathname: string): Route {
  switch (pathname) {
    case '/':
      return 'register';
    case '/admin':
      return 'admin';
    case '/dashboard':
      return 'dashboard';
    case '/forgot-password':
      return 'forgot';
    case '/lobby':
      return 'lobby';
    case '/login':
      return 'login';
    case '/not-found':
      return 'notFound';
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
    case 'lobby':
      return '/lobby';
    case 'login':
      return '/login';
    case 'notFound':
      return '/not-found';
    case 'pending':
      return '/verify-email-pending';
    case 'playSolo':
      return '/play/solo';
    case 'register':
      return '/';
    case 'verify':
      return '/verify-email';
  }
}

const FALLBACK_SNIPPET: RaceSnippet = {
  id: 'fallback-snippet',
  code: '',
  type: 'EASY',
};

function SoloRacePage({ onGoLobby }: { onGoLobby: () => void }) {
  const { session, preview, isLoading, error, startNewRace, resetToMenuState } =
    useSoloRaceSession();

  const activeSnippet = session?.snippet ?? preview?.snippet ?? FALLBACK_SNIPPET;
  const startedAt = session?.startedAt ?? new Date().toISOString();
  const shouldShowSnippetError =
    !session && !preview && !isLoading && error === 'failed_to_start_solo_race';
  const errorMessage = shouldShowSnippetError
    ? 'Unable to load solo race snippet.'
    : null;

  return (
    <SoloRace
      errorMessage={errorMessage}
      onLobbyNavigate={async () => {
        await resetToMenuState();
        onGoLobby();
      }}
      onRestartRace={startNewRace}
      onStartRace={startNewRace}
      snippet={activeSnippet}
      startedAt={startedAt}
      transport={session?.transport}
    />
  );
}

function isProtected(route: Route) {
  return route === 'admin' || route === 'dashboard';
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

  if (session && isAuthRoute(route)) {
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
  const { dashboardNotice, loginNotice, pendingEmail, route, session } = state;

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

  if (session && (route === 'admin' || route === 'dashboard')) {
    return (
      <DashboardPage
        notice={dashboardNotice}
        onGoAdmin={() => navigate('admin')}
        onGoDashboard={() => navigate('dashboard')}
        onGoLobby={() => navigate('lobby')}
        onLogout={handleLogout}
        session={session}
        view={route === 'admin' ? 'admin' : 'dashboard'}
      />
    );
  }

  if (route === 'forgot') {
    return <ForgotPasswordPage onBackToLogin={() => navigate('login')} />;
  }

  if (route === 'lobby') {
    return <LobbyPage onOpenSolo={() => navigate('playSolo')} />;
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

  if (route === 'playSolo') {
    return <SoloRacePage onGoLobby={() => navigate('lobby')} />;
  }

  if (route === 'notFound') {
    return (
      <NotFoundPage
        onGoHome={() =>
          navigate(session ? defaultAuthenticatedRoute(session) : 'register')
        }
      />
    );
  }

  return (
    <RegisterPage
      onRegister={handleRegister}
      onSignIn={() => navigate('login')}
    />
  );
}
