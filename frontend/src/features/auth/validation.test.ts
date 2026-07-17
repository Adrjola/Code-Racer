import { describe, expect, it } from 'vitest';
import { emailError, validateLogin, validateRegistration } from './validation';

describe('auth validation', () => {
  it('rejects missing and malformed email addresses', () => {
    expect(emailError('')).toBe('Email is required');
    expect(emailError('a@@b..com')).toMatch(/valid email/i);
    expect(emailError('racer@example.com')).toBeUndefined();
  });

  it('validates login fields centrally', () => {
    expect(validateLogin({ identifier: '', password: '' })).toMatchObject({
      identifier: 'Email or username is required',
      password: 'Password is required',
    });
  });

  it('validates registration fields centrally', () => {
    expect(
      validateRegistration({
        confirmPassword: 'DifferentPass123',
        email: 'racer@example.com',
        password: 'StrongerPass123',
        username: 'racer',
      }),
    ).toMatchObject({
      confirmPassword: 'Passwords do not match',
    });
  });
});
