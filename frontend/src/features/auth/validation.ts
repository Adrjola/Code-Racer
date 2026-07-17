import type { LoginCredentials, RegistrationValues } from './auth';

export type FormErrors<T> = Partial<Record<keyof T, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

function requiredError(value: string, fieldName: string): string | undefined {
  return value.trim() ? undefined : `${fieldName} is required`;
}

export function emailError(value: string): string | undefined {
  const missingEmail = requiredError(value, 'Email');
  if (missingEmail) return missingEmail;

  if (!EMAIL_PATTERN.test(value)) {
    return 'Enter a valid email address, e.g. racer@gmail.com';
  }

  return undefined;
}

export function identifierError(value: string): string | undefined {
  return requiredError(value, 'Email or username');
}

export function passwordError(value: string): string | undefined {
  return value ? undefined : 'Password is required';
}

export function confirmPasswordError(
  password: string,
  confirmPassword: string,
): string | undefined {
  if (!confirmPassword) return 'Please confirm your password';
  if (password && confirmPassword !== password) return 'Passwords do not match';
  return undefined;
}

export function validateLogin(
  values: LoginCredentials,
): FormErrors<LoginCredentials> {
  return {
    identifier: identifierError(values.identifier),
    password: passwordError(values.password),
  };
}

export function validateRegistration(
  values: RegistrationValues,
): FormErrors<RegistrationValues> {
  return {
    confirmPassword: confirmPasswordError(
      values.password,
      values.confirmPassword,
    ),
    email: emailError(values.email),
    password: passwordError(values.password),
    username: requiredError(values.username, 'Username'),
  };
}

export function hasFormErrors<T extends object>(
  errors: FormErrors<T>,
): boolean {
  return Object.values(errors).some(Boolean);
}
