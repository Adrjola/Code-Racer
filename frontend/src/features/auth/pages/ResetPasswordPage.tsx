import AuthLayout from '@/components/AuthLayout';
import GradientButton from '@/components/GradientButton';
import TextField from '@/components/TextField';
import { LockIcon } from '@/components/icons';
import { readableAuthError, resetPassword } from '@/features/auth/auth';
import type { ResetPasswordValues } from '@/features/auth/auth';
import { useAuthForm } from '@/features/auth/useAuthForm';
import {
  hasFormErrors,
  validatePasswordReset,
} from '@/features/auth/validation';

type ResetPasswordPageProps = {
  onBackToLogin: (notice?: string) => void;
  token: string | null;
};

export default function ResetPasswordPage({
  onBackToLogin,
  token,
}: ResetPasswordPageProps) {
  const {
    errors,
    formMessage,
    isSubmitting,
    setErrors,
    setFormMessage,
    setIsSubmitting,
    setValue,
    values,
  } = useAuthForm<ResetPasswordValues>({
    confirmPassword: '',
    newPassword: '',
    token: token ?? '',
  });

  const isMissingToken = !token;
  const isSuccessful = formMessage === 'Password changed successfully.';

  const handleSubmit = async () => {
    const nextErrors = validatePasswordReset(values);
    setErrors(nextErrors);
    if (hasFormErrors(nextErrors)) {
      return;
    }

    setIsSubmitting(true);
    setFormMessage(undefined);
    try {
      await resetPassword(values);
      setFormMessage('Password changed successfully.');
    } catch (error) {
      setFormMessage(readableAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      footer={null}
      onSubmit={handleSubmit}
      subtitle={
        isSuccessful
          ? 'Your password has been updated.'
          : 'Enter a new password for your account.'
      }
      subtitleSize="sm"
      title={isSuccessful ? 'Password changed' : 'Reset your password'}
      variant="login"
    >
      {isMissingToken ? (
        <p
          className="rounded-[10px] border border-pink-400/25 bg-pink-400/10 px-4 py-[clamp(0.875rem,2dvh,1rem)] text-center text-[13px] leading-[1.45] text-text-secondary"
          role="status"
        >
          This password reset link is missing a token. Request a new password
          reset email and try again.
        </p>
      ) : isSuccessful ? (
        <p
          className="rounded-[10px] border border-pink-400/25 bg-pink-400/10 px-4 py-[clamp(0.875rem,2dvh,1rem)] text-center text-[13px] leading-[1.45] text-text-secondary"
          role="status"
        >
          Your password has been changed. You can now log in with your new
          password.
        </p>
      ) : (
        <>
          <TextField
            autoComplete="new-password"
            disabled={isSubmitting}
            error={errors.newPassword}
            icon={<LockIcon />}
            id="reset-new-password"
            label="New password"
            maxLength={72}
            onChange={setValue('newPassword')}
            placeholder="**********"
            type="password"
            value={values.newPassword}
          />
          <TextField
            autoComplete="new-password"
            disabled={isSubmitting}
            error={errors.confirmPassword}
            icon={<LockIcon />}
            id="reset-confirm-password"
            label="Confirm password"
            maxLength={72}
            onChange={setValue('confirmPassword')}
            placeholder="**********"
            type="password"
            value={values.confirmPassword}
          />
          {formMessage && (
            <p
              className="mt-4 rounded-[10px] border border-pink-400/25 bg-pink-400/10 px-3 py-2 text-[13px] leading-[1.45] text-text-secondary"
              role="status"
            >
              {formMessage}
            </p>
          )}
        </>
      )}

      <GradientButton
        className="mt-[clamp(1.25rem,3.8dvh,2.25rem)] lg:mt-[36px]"
        disabled={isSubmitting}
        onClick={
          isMissingToken || isSuccessful
            ? () =>
                onBackToLogin(
                  isSuccessful
                    ? 'Password changed. You can now log in.'
                    : undefined,
                )
            : undefined
        }
        type={isMissingToken || isSuccessful ? 'button' : 'submit'}
      >
        {isMissingToken || isSuccessful
          ? 'Back to log in'
          : isSubmitting
            ? 'Changing password...'
            : 'Change password'}
      </GradientButton>
    </AuthLayout>
  );
}
