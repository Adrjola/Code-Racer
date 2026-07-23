import { useEffect, useState } from 'react';
import AuthLayout from '@/components/AuthLayout';
import GradientButton from '@/components/GradientButton';
import { confirmEmail, readableAuthError } from '@/features/auth/auth';
import ResendVerificationForm from '@/features/auth/components/ResendVerificationForm';
import type { CurrentUser } from '@/features/auth/session';

type VerifyEmailPageProps = {
  onBackToLogin: (notice?: string) => void;
  token: string | null;
};

type VerificationState =
  | { message: string; status: 'error' }
  | { email: string; status: 'success' }
  | { status: 'verifying' };

const pendingConfirmations = new Map<string, Promise<CurrentUser>>();

function confirmEmailOnce(token: string): Promise<CurrentUser> {
  const existingConfirmation = pendingConfirmations.get(token);
  if (existingConfirmation) {
    return existingConfirmation;
  }

  const confirmation = confirmEmail(token).finally(() => {
    pendingConfirmations.delete(token);
  });
  pendingConfirmations.set(token, confirmation);
  return confirmation;
}

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
    confirmEmailOnce(token)
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
      <div
        className="rounded-[10px] border border-pink-400/25 bg-pink-400/10 px-4 py-[clamp(0.875rem,2dvh,1rem)] text-center text-[13px] leading-[1.45] text-text-secondary"
        role="status"
      >
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
      {state.status === 'error' && <ResendVerificationForm />}
      <GradientButton
        className="mt-[clamp(1.25rem,3.8dvh,2.25rem)] lg:mt-[36px]"
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
