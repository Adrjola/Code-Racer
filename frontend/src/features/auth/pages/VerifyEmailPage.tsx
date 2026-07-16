import { useEffect, useState } from 'react';
import AuthLayout from '@/components/AuthLayout';
import GradientButton from '@/components/GradientButton';
import { confirmEmail, readableAuthError } from '@/features/auth/auth';

type VerifyEmailPageProps = {
  onBackToLogin: (notice?: string) => void;
  token: string | null;
};

type VerificationState =
  | { message: string; status: 'error' }
  | { email: string; status: 'success' }
  | { status: 'verifying' };

export default function VerifyEmailPage({
  onBackToLogin,
  token,
}: VerifyEmailPageProps) {
  const [state, setState] = useState<VerificationState>(() =>
    token
      ? { status: 'verifying' }
      : {
          message: 'Verification link is missing a token.',
          status: 'error',
        },
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let isMounted = true;
    confirmEmail(token)
      .then((user) => {
        if (isMounted) {
          setState({ email: user.email, status: 'success' });
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setState({ message: readableAuthError(error), status: 'error' });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const isSuccess = state.status === 'success';

  return (
    <AuthLayout
      footer={null}
      subtitle={
        isSuccess
          ? 'Your account is active. Use your email or username to log in.'
          : 'We are checking your verification link.'
      }
      subtitleSize="sm"
      title={isSuccess ? 'Email verified' : 'Verify your email'}
    >
      <div className="auth-status-card" role="status">
        {state.status === 'verifying' && 'Verifying your email...'}
        {state.status === 'success' && (
          <>
            <span className="font-semibold text-text-primary">
              {state.email}
            </span>{' '}
            is verified.
          </>
        )}
        {state.status === 'error' && state.message}
      </div>
      <GradientButton
        className="auth-submit auth-submit--compact"
        onClick={() =>
          onBackToLogin(
            isSuccess ? 'Email verified. You can now log in.' : undefined,
          )
        }
        type="button"
      >
        Back to log in
      </GradientButton>
    </AuthLayout>
  );
}
