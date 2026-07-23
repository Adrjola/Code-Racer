import { useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import GradientButton from '@/components/GradientButton';
import TextField from '@/components/TextField';
import { LockIcon, UserIcon } from '@/components/icons';
import type { LoginCredentials } from '@/features/auth/auth';
import { readableAuthError } from '@/features/auth/auth';
import { useAuthForm } from '@/features/auth/useAuthForm';
import { hasFormErrors, validateLogin } from '@/features/auth/validation';

type LoginPageProps = {
  notice?: string;
  onCreateAccount: () => void;
  onForgotPassword: () => void;
  onLogin: (values: LoginCredentials) => Promise<void>;
};

export default function LoginPage({
  notice,
  onCreateAccount,
  onForgotPassword,
  onLogin,
}: LoginPageProps) {
  const {
    errors,
    formMessage,
    isSubmitting,
    setErrors,
    setFormMessage,
    setIsSubmitting,
    setValue,
    values,
  } = useAuthForm<LoginCredentials>({
    identifier: '',
    password: '',
  });

  useEffect(() => {
    setFormMessage(notice);
  }, [notice, setFormMessage]);

  const handleSubmit = async () => {
    const nextErrors = validateLogin(values);
    setErrors(nextErrors);
    if (hasFormErrors(nextErrors)) {
      return;
    }

    setIsSubmitting(true);
    setFormMessage(undefined);
    try {
      await onLogin(values);
    } catch (error) {
      setFormMessage(readableAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      footer={
        <>
          <span className="text-text-muted">New to CodeRacer? </span>
          <button
            className="font-semibold text-pink-400"
            onClick={onCreateAccount}
            type="button"
          >
            Create an account
          </button>
        </>
      }
      onSubmit={handleSubmit}
      subtitle="Log in to jump back into a race."
      title="Welcome back"
      variant="login"
    >
      <TextField
        autoComplete="username"
        disabled={isSubmitting}
        error={errors.identifier}
        icon={<UserIcon />}
        id="login-identifier"
        label="Email or username"
        maxLength={120}
        onChange={setValue('identifier')}
        placeholder="username"
        value={values.identifier}
      />
      <TextField
        autoComplete="current-password"
        disabled={isSubmitting}
        error={errors.password}
        icon={<LockIcon />}
        id="login-password"
        label="Password"
        maxLength={72}
        onChange={setValue('password')}
        placeholder="**********"
        type="password"
        value={values.password}
      />
      <p className="mt-2.5 text-right text-[10px] leading-[1.2]">
        <button
          className="text-pink-400"
          onClick={onForgotPassword}
          type="button"
        >
          Forgot?
        </button>
      </p>
      {formMessage && (
        <p
          className="mt-4 rounded-[10px] border border-pink-400/25 bg-pink-400/10 px-3 py-2 text-[13px] leading-[1.45] text-text-secondary"
          role="status"
        >
          {formMessage}
        </p>
      )}
      <GradientButton
        className="mt-[clamp(1.25rem,3.8dvh,2.25rem)] lg:mt-[22px]"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Logging in...' : 'Log in'}
      </GradientButton>
    </AuthLayout>
  );
}
