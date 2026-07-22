import type { AdminUserEditValues } from './usersApi';

export type FormErrors<T> = Partial<Record<keyof T, string>>;

const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const USERNAME_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,19}$/i;

export function usernameError(value: string): string | undefined {
  if (!value.trim()) {
    return 'Username is required';
  }
  if (!USERNAME_PATTERN.test(value.trim())) {
    return 'Username must be 3 to 20 characters and contain only letters, numbers, underscores, or hyphens';
  }
  return undefined;
}

export function emailError(value: string): string | undefined {
  if (!value.trim()) {
    return 'Email is required';
  }
  if (value.length > 120 || !EMAIL_PATTERN.test(value.trim())) {
    return 'Email must be a valid email address';
  }
  return undefined;
}

export function validateUserEdit(
  values: AdminUserEditValues,
): FormErrors<AdminUserEditValues> {
  return {
    email: emailError(values.email),
    username: usernameError(values.username),
  };
}

export function hasFormErrors<T extends object>(
  errors: FormErrors<T>,
): boolean {
  return Object.values(errors).some(Boolean);
}
