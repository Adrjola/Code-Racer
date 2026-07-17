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

export type LoginCredentials = {
  identifier: string;
  password: string;
};

export type RegistrationValues = {
  confirmPassword: string;
  email: string;
  password: string;
  username: string;
};

export type ResendVerificationValues = {
  email: string;
};

type BaseResponse<T> = {
  data: T;
};

type LoginResponse = {
  accessToken: string;
  expiresInSeconds: number;
  tokenType: string;
  user: CurrentUser;
};

type EmailVerificationResendResponse = {
  message: string;
};

type ApiErrorBody = {
  code?: string;
  message?: string;
  status?: number;
};

export class ApiRequestError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
  }
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'http://localhost:8080';
const SESSION_KEY = 'code-racer.auth-session';

export async function registerUser(
  values: RegistrationValues,
): Promise<CurrentUser> {
  const response = await apiRequest<BaseResponse<CurrentUser>>(
    '/api/auth/register',
    {
      body: JSON.stringify(values),
      method: 'POST',
    },
  );

  return response.data;
}

export async function loginUser(
  credentials: LoginCredentials,
): Promise<AuthSession> {
  const response = await apiRequest<BaseResponse<LoginResponse>>(
    '/api/auth/login',
    {
      body: JSON.stringify({
        identifier: credentials.identifier,
        password: credentials.password,
      }),
      method: 'POST',
    },
  );

  const session = {
    accessToken: response.data.accessToken,
    expiresAt: Date.now() + response.data.expiresInSeconds * 1000,
    tokenType: response.data.tokenType,
    user: response.data.user,
  };
  saveSession(session);
  return session;
}

export async function confirmEmail(token: string): Promise<CurrentUser> {
  const response = await apiRequest<BaseResponse<CurrentUser>>(
    '/api/auth/email-verification/confirm',
    {
      body: JSON.stringify({ token }),
      method: 'POST',
    },
  );

  return response.data;
}

export async function resendVerificationEmail(
  values: ResendVerificationValues,
): Promise<string> {
  const response = await apiRequest<
    BaseResponse<EmailVerificationResendResponse>
  >('/api/auth/email-verification/resend', {
    body: JSON.stringify({ email: values.email }),
    method: 'POST',
  });

  return response.data.message;
}

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

export function readableAuthError(error: unknown): string {
  if (!(error instanceof ApiRequestError)) {
    return 'Cannot reach the server. Check your connection and try again.';
  }

  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return 'Email, username, or password is incorrect. If you just registered, verify your email before logging in.';
    case 'TOO_MANY_LOGIN_ATTEMPTS':
      return 'Too many failed attempts. Wait a few minutes and try again.';
    case 'USER_ALREADY_EXISTS':
      return 'A user with this email or username already exists.';
    case 'EMAIL_VERIFICATION_FAILED':
      return 'This verification link is invalid or expired. Request a new verification email and try again.';
    case 'INVALID_INPUT':
    case 'VALIDATION_FAILED':
      return error.message;
    default:
      return error.message || 'Something went wrong. Please try again.';
  }
}

export type ApiRequestOptions = RequestInit & { authenticated?: boolean };

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { authenticated, ...init } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  if (authenticated) {
    const session = loadSession();
    if (!session) {
      throw new ApiRequestError(
        'Your session has expired. Log in again to continue.',
        'AUTHENTICATION_REQUIRED',
        401,
      );
    }
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiRequestError('Network request failed');
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  return (await response.json()) as T;
}

async function toApiError(response: Response): Promise<ApiRequestError> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return new ApiRequestError(
      body.message || response.statusText,
      body.code,
      body.status || response.status,
    );
  } catch {
    return new ApiRequestError(response.statusText, undefined, response.status);
  }
}
