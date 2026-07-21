import type {
  LoginCredentials,
  RegistrationValues,
  ResetPasswordValues,
} from './auth';

export type FormErrors<T> = Partial<Record<keyof T, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{2,19}$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

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
  if (!value) return 'Password is required';
  if (
    value.length < MIN_PASSWORD_LENGTH ||
    value.length > MAX_PASSWORD_LENGTH
  ) {
    return `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`;
  }
  return undefined;
}

export function usernameError(value: string): string | undefined {
  const missingUsername = requiredError(value, 'Username');
  if (missingUsername) return missingUsername;

  if (!USERNAME_PATTERN.test(value)) {
    return 'Username must be 3 to 20 characters and use letters, numbers, underscores, or hyphens';
  }

  return undefined;
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
    username: usernameError(values.username),
  };
}

export function validatePasswordReset(
  values: ResetPasswordValues,
): FormErrors<ResetPasswordValues> {
  return {
    confirmPassword: confirmPasswordError(
      values.newPassword,
      values.confirmPassword,
    ),
    newPassword: passwordError(values.newPassword),
    token: requiredError(values.token, 'Reset token'),
  };
}

export function hasFormErrors<T extends object>(
  errors: FormErrors<T>,
): boolean {
  return Object.values(errors).some(Boolean);
}
