import { describe, expect, it } from 'vitest';
import { readableAuthError } from './auth';
import { ApiRequestError } from '@/lib/apiClient';

describe('readableAuthError', () => {
  it('maps known API errors to user-safe messages', () => {
    expect(
      readableAuthError(
        new ApiRequestError(
          'Invalid email, username, or password',
          'INVALID_CREDENTIALS',
          401,
        ),
      ),
    ).toMatch(/email, username, or password/i);
    expect(
      readableAuthError(
        new ApiRequestError(
          'Too many attempts',
          'TOO_MANY_LOGIN_ATTEMPTS',
          429,
        ),
      ),
    ).toMatch(/too many/i);
    expect(
      readableAuthError(
        new ApiRequestError('Duplicate', 'USER_ALREADY_EXISTS', 409),
      ),
    ).toMatch(/already exists/i);
    expect(
      readableAuthError(
        new ApiRequestError(
          'Email verification link is invalid or expired',
          'EMAIL_VERIFICATION_FAILED',
          400,
        ),
      ),
    ).toMatch(/verification link is invalid or expired/i);
    expect(
      readableAuthError(
        new ApiRequestError(
          'Password reset link is invalid or expired',
          'PASSWORD_RESET_FAILED',
          400,
        ),
      ),
    ).toMatch(/password reset link is invalid or expired/i);
    expect(
      readableAuthError(
        new ApiRequestError('Validation failed', 'INVALID_INPUT', 400),
      ),
    ).toBe('Validation failed');
    expect(readableAuthError(new ApiRequestError('Server error'))).toBe(
      'Server error',
    );
    expect(readableAuthError(new Error('offline'))).toMatch(/cannot reach/i);
  });
});
