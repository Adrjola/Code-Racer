import { useState } from 'react';
import AuthLayout from '@/components/AuthLayout';
import GradientButton from '@/components/GradientButton';
import TextField from '@/components/TextField';
import { LockIcon, UserIcon } from '@/components/icons';
import type { LoginCredentials } from '@/features/auth/auth';
import { readableAuthError } from '@/features/auth/auth';

type LoginPageProps = {
  notice?: string;
  onCreateAccount: () => void;
  onForgotPassword: () => void;
  onLogin: (values: LoginCredentials) => Promise<void>;
};

type LoginErrors = Partial<LoginCredentials>;

function validate(values: LoginCredentials): LoginErrors {
  const errors: LoginErrors = {};

  if (!values.identifier.trim()) {
    errors.identifier = 'Email or username is required';
  }

  if (!values.password) {
    errors.password = 'Password is required';
  }

  return errors;
}

export default function LoginPage({
  notice,
  onCreateAccount,
  onForgotPassword,
  onLogin,
}: LoginPageProps) {
  const [values, setValues] = useState<LoginCredentials>({
    identifier: '',
    password: '',
  });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [formMessage, setFormMessage] = useState<string | undefined>(notice);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = (field: keyof LoginCredentials) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormMessage(undefined);
  };

  const handleSubmit = async () => {
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
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
        placeholder="racer or racer@gmail.com"
        value={values.identifier}
      />
      <TextField
        autoComplete="current-password"
        className="mt-[clamp(10px,5.3vh_-_23px,34px)]"
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
      <p className="mt-2.5 text-right text-[10px]">
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
          className="mt-4 rounded-[8px] border border-pink-400/25 bg-pink-400/10 px-3 py-2 text-[13px] text-text-secondary"
          role="status"
        >
          {formMessage}
        </p>
      )}
      <GradientButton
        className="mt-[clamp(12px,5.3vh_-_21px,36px)]"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Logging in...' : 'Log in'}
      </GradientButton>
    </AuthLayout>
  );
}
