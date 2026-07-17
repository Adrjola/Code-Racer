import {
  apiRequest,
  ApiRequestError,
  type BaseResponse,
} from '@/lib/apiClient';
import { saveSession, type AuthSession, type CurrentUser } from './session';

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

type LoginResponse = {
  accessToken: string;
  expiresInSeconds: number;
  tokenType: string;
  user: CurrentUser;
};

type EmailVerificationResendResponse = {
  message: string;
};

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
