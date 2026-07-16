import AuthLayout from '@/components/AuthLayout';
import GradientButton from '@/components/GradientButton';

type VerificationPendingPageProps = {
  email?: string;
  onBackToLogin: () => void;
};

export default function VerificationPendingPage({
  email,
  onBackToLogin,
}: VerificationPendingPageProps) {
  return (
    <AuthLayout
      footer={null}
      subtitle="Open the verification link we sent before logging in."
      subtitleSize="sm"
      title="Check your email"
    >
      <div className="auth-status-card" role="status">
        We created your account
        {email ? (
          <>
            {' '}
            for <span className="font-semibold text-text-primary">{email}</span>
          </>
        ) : null}
        . Verify your email, then come back to log in.
      </div>
      <GradientButton
        className="auth-submit auth-submit--compact"
        onClick={onBackToLogin}
        type="button"
      >
        Back to log in
      </GradientButton>
    </AuthLayout>
  );
}
