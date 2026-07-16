const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export function emailError(value: string): string | undefined {
  if (!value.trim()) {
    return 'Email is required';
  }
  if (!EMAIL_PATTERN.test(value)) {
    return 'Enter a valid email address, e.g. racer@gmail.com';
  }
  return undefined;
}
