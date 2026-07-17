export type UserRole = 'ADMIN' | 'USER';

export type CurrentUser = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  emailVerified: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuthSession = {
  accessToken: string;
  expiresAt: number;
  tokenType: string;
  user: CurrentUser;
};

const SESSION_KEY = 'code-racer.auth-session';

export function clearSession() {
  window.sessionStorage.removeItem(SESSION_KEY);
}

export function isSessionExpired(session: AuthSession): boolean {
  return session.expiresAt <= Date.now();
}

export function loadSession(): AuthSession | null {
  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const session = JSON.parse(raw) as AuthSession;
    if (!session.accessToken || !session.user || isSessionExpired(session)) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function saveSession(session: AuthSession) {
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
