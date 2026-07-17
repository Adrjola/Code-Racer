import { useEffect, useState } from 'react';
import GradientButton from '@/components/GradientButton';
import TextField from '@/components/TextField';
import { MailIcon } from '@/components/icons';
import {
  readableAuthError,
  resendVerificationEmail,
} from '@/features/auth/auth';
import { emailError } from '@/features/auth/validation';

type ResendVerificationFormProps = {
  defaultEmail?: string;
};

const RESEND_COOLDOWN_SECONDS = 120;

function formatCooldown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export default function ResendVerificationForm({
  defaultEmail,
}: ResendVerificationFormProps) {
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const shouldAskForEmail = !defaultEmail;
  const isCoolingDown = cooldownSeconds > 0;

  useEffect(() => {
    if (!isCoolingDown) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isCoolingDown]);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setError(undefined);
    setMessage(undefined);
  };

  const handleResend = async () => {
    if (isCoolingDown) {
      return;
    }

    const nextError = emailError(email);
    setError(nextError);
    if (nextError) {
      return;
    }

    setIsSubmitting(true);
    setMessage(undefined);
    try {
      setMessage(await resendVerificationEmail({ email }));
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setMessage(readableAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-[clamp(1.25rem,3.8dvh,2.25rem)] lg:mt-[28px]">
      {shouldAskForEmail && (
        <TextField
          autoComplete="email"
          disabled={isSubmitting || isCoolingDown}
          error={error}
          icon={<MailIcon />}
          id="resend-verification-email"
          label="Email"
          maxLength={120}
          onChange={handleEmailChange}
          placeholder="racer@gmail.com"
          type="email"
          value={email}
        />
      )}

      {message && (
        <p
          className="mt-4 rounded-[10px] border border-pink-400/25 bg-pink-400/10 px-3 py-2 text-[13px] leading-[1.45] text-text-secondary"
          role="status"
        >
          {message}
        </p>
      )}

      <GradientButton
        className="mt-[clamp(1.25rem,3.8dvh,2.25rem)] lg:mt-[28px]"
        disabled={isSubmitting || isCoolingDown}
        onClick={handleResend}
        type="button"
      >
        {isSubmitting
          ? 'Sending...'
          : isCoolingDown
            ? `Try again in ${formatCooldown(cooldownSeconds)}`
            : 'Resend verification email'}
      </GradientButton>
    </div>
  );
}
