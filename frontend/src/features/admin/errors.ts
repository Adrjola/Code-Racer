import { ApiRequestError } from '@/lib/apiClient';

export function readableAdminError(error: unknown): string {
  if (!(error instanceof ApiRequestError)) {
    return 'Cannot reach the server. Check your connection and try again.';
  }

  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Cannot reach the server. Check your connection and try again.';
    case 'SESSION_EXPIRED':
      return 'Your session expired. Log in again to continue.';
    case 'RESOURCE_NOT_FOUND':
      return 'That item no longer exists. Refresh the list and try again.';
    case 'CONFLICT':
    case 'INVALID_INPUT':
    case 'VALIDATION_FAILED':
      return error.message;
    default:
      if (error.status === 403) {
        return 'Your account is not allowed to manage the catalog.';
      }
      return error.message || 'Something went wrong. Please try again.';
  }
}
