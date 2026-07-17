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

  it('matches the backend password and username rules', () => {
    expect(
      validateRegistration({
        confirmPassword: 'short',
        email: 'racer@example.com',
        password: 'short',
        username: 'Speed_Racer',
      }),
    ).toMatchObject({
      password: 'Password must be between 8 and 16 characters',
      username:
        'Username must be 3 to 20 characters and use lowercase letters, numbers, underscores, or hyphens',
    });

    expect(
      validateRegistration({
        confirmPassword: 'LongPassword12345',
        email: 'racer@example.com',
        password: 'LongPassword12345',
        username: 'speed_racer',
      }),
    ).toMatchObject({
      password: 'Password must be between 8 and 16 characters',
    });
  });
});
