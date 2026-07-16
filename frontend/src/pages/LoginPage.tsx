import { useState } from 'react';
import AuthLayout from '../components/AuthLayout';
import GradientButton from '../components/GradientButton';
import TextField from '../components/TextField';
import { LockIcon, UserIcon } from '../components/icons';

type LoginPageProps = {
  onCreateAccount: () => void;
  onForgotPassword: () => void;
};

type LoginValues = {
  identifier: string;
  password: string;
};

type LoginErrors = Partial<LoginValues>;

function validate(values: LoginValues): LoginErrors {
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
  onCreateAccount,
  onForgotPassword,
}: LoginPageProps) {
  const [values, setValues] = useState<LoginValues>({
    identifier: '',
    password: '',
  });
  const [errors, setErrors] = useState<LoginErrors>({});

  const setValue = (field: keyof LoginValues) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = () => setErrors(validate(values));

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
        className="mt-[clamp(10px,5.3vh_-_23px,34px)]"
        error={errors.password}
        icon={<LockIcon />}
        id="login-password"
        label="Password"
        maxLength={72}
        onChange={setValue('password')}
        placeholder="••••••••••"
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
      <GradientButton className="mt-[clamp(12px,5.3vh_-_21px,36px)]">
        Log in
      </GradientButton>
    </AuthLayout>
  );
}
