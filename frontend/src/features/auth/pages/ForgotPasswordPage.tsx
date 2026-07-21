import { useState } from 'react';
import AuthLayout from '@/components/AuthLayout';
import GradientButton from '@/components/GradientButton';
import TextField from '@/components/TextField';
import { MailIcon } from '@/components/icons';
import { readableAuthError, requestPasswordReset } from '@/features/auth/auth';
import { emailError } from '@/features/auth/validation';

type ForgotPasswordPageProps = {
  onBackToLogin: () => void;
};

export default function ForgotPasswordPage({
  onBackToLogin,
}: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (value: string) => {
    setEmail(value);
    setError(undefined);
    setMessage(undefined);
  };

  const handleSubmit = async () => {
    const nextError = emailError(email);
    setError(nextError);
    if (nextError) {
      return;
    }

    setIsSubmitting(true);
    setMessage(undefined);
    try {
      setMessage(await requestPasswordReset({ email }));
    } catch (error) {
      setMessage(readableAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      footer={
        <button
          className="font-semibold text-pink-400"
          onClick={onBackToLogin}
          type="button"
        >
          &larr; Back to log in
        </button>
      }
      onSubmit={handleSubmit}
      subtitle="Enter your email and we'll send you a link to reset your password."
      subtitleSize="sm"
      title="Reset your password"
    >
      <TextField
        autoComplete="email"
        disabled={isSubmitting}
        error={error}
        icon={<MailIcon />}
        id="forgot-email"
        label="Email"
        maxLength={120}
        onChange={handleChange}
        placeholder="racer@gmail.com"
        type="email"
        value={email}
      />
      {message && (
        <p
          className="mt-4 rounded-[10px] border border-pink-400/25 bg-pink-400/10 px-3 py-2 text-[13px] leading-[1.45] text-text-secondary"
          role="status"
        >
          {message}
        </p>
      )}
      <GradientButton
        className="mt-[clamp(1.5rem,5dvh,3.5rem)] lg:mt-[56px]"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Sending...' : 'Send reset link'}
      </GradientButton>
    </AuthLayout>
  );
}
