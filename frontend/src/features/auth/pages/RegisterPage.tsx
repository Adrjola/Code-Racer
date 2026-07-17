import AuthLayout from '@/components/AuthLayout';
import GradientButton from '@/components/GradientButton';
import TextField from '@/components/TextField';
import { LockIcon, MailIcon, UserIcon } from '@/components/icons';
import type { RegistrationValues } from '@/features/auth/auth';
import { readableAuthError } from '@/features/auth/auth';
import { useAuthForm } from '@/features/auth/useAuthForm';
import {
  hasFormErrors,
  validateRegistration,
} from '@/features/auth/validation';

type RegisterPageProps = {
  onRegister: (values: RegistrationValues) => Promise<void>;
  onSignIn: () => void;
};

export default function RegisterPage({
  onRegister,
  onSignIn,
}: RegisterPageProps) {
  const {
    errors,
    formMessage,
    isSubmitting,
    setErrors,
    setFormMessage,
    setIsSubmitting,
    setValue,
    values,
  } = useAuthForm<RegistrationValues>({
    confirmPassword: '',
    email: '',
    password: '',
    username: '',
  });

  const handleSubmit = async () => {
    const nextErrors = validateRegistration(values);
    setErrors(nextErrors);
    if (hasFormErrors(nextErrors)) {
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
      formClassName="lg:min-h-[667px]"
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
        maxLength={16}
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
        maxLength={16}
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
      <GradientButton
        className="mt-[clamp(1.5rem,5dvh,3.5rem)] lg:mt-[53px]"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Creating account...' : 'Create account'}
      </GradientButton>
    </AuthLayout>
  );
}
