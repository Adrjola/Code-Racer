import { useState } from 'react';
import AuthLayout from '@/components/AuthLayout';
import GradientButton from '@/components/GradientButton';
import TextField from '@/components/TextField';
import { LockIcon, MailIcon, UserIcon } from '@/components/icons';
import type { RegistrationValues } from '@/features/auth/auth';
import { readableAuthError } from '@/features/auth/auth';
import { emailError } from '@/features/auth/validation';

type RegisterPageProps = {
  onRegister: (values: RegistrationValues) => Promise<void>;
  onSignIn: () => void;
};

type RegisterErrors = Partial<RegistrationValues>;

function validate(values: RegistrationValues): RegisterErrors {
  const errors: RegisterErrors = {};

  errors.email = emailError(values.email);

  if (!values.username.trim()) {
    errors.username = 'Username is required';
  }

  if (!values.password) {
    errors.password = 'Password is required';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (values.password && values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
}

export default function RegisterPage({
  onRegister,
  onSignIn,
}: RegisterPageProps) {
  const [values, setValues] = useState<RegistrationValues>({
    confirmPassword: '',
    email: '',
    password: '',
    username: '',
  });
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [formMessage, setFormMessage] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = (field: keyof RegistrationValues) => (value: string) => {
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
      await onRegister(values);
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
          <span className="text-text-muted">Already have an account? </span>
          <button
            className="font-semibold text-pink-400"
            onClick={onSignIn}
            type="button"
          >
            Sign in
          </button>
        </>
      }
      formClassName="auth-form--register"
      onSubmit={handleSubmit}
      subtitle="Start racing in just a few minutes!"
      subtitleSize="sm"
      title="Create your account"
    >
      <TextField
        autoComplete="email"
        disabled={isSubmitting}
        error={errors.email}
        icon={<MailIcon />}
        id="register-email"
        label="Email"
        maxLength={120}
        onChange={setValue('email')}
        placeholder="racer@gmail.com"
        type="email"
        value={values.email}
      />
      <TextField
        autoComplete="username"
        disabled={isSubmitting}
        error={errors.username}
        icon={<UserIcon />}
        id="register-username"
        label="Username"
        maxLength={20}
        onChange={setValue('username')}
        placeholder="username"
        value={values.username}
      />
      <TextField
        autoComplete="new-password"
        disabled={isSubmitting}
        error={errors.password}
        icon={<LockIcon />}
        id="register-password"
        label="Password"
        maxLength={72}
        onChange={setValue('password')}
        placeholder="**********"
        type="password"
        value={values.password}
      />
      <TextField
        autoComplete="new-password"
        disabled={isSubmitting}
        error={errors.confirmPassword}
        icon={<LockIcon />}
        id="register-confirm-password"
        label="Confirm password"
        maxLength={72}
        onChange={setValue('confirmPassword')}
        placeholder="**********"
        type="password"
        value={values.confirmPassword}
      />
      {formMessage && (
        <p className="form-message" role="status">
          {formMessage}
        </p>
      )}
      <GradientButton className="auth-submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating account...' : 'Create account'}
      </GradientButton>
    </AuthLayout>
  );
}
