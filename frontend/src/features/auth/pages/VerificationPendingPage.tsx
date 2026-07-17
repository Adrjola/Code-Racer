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
      <div
        className="rounded-[10px] border border-pink-400/25 bg-pink-400/10 px-4 py-[clamp(0.875rem,2dvh,1rem)] text-center text-[13px] leading-[1.45] text-text-secondary"
        role="status"
      >
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
        className="mt-[clamp(1.25rem,3.8dvh,2.25rem)] lg:mt-[36px]"
        onClick={onBackToLogin}
        type="button"
      >
        Back to log in
      </GradientButton>
    </AuthLayout>
  );
}
