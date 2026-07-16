import { useState } from 'react';
import AuthLayout from '../components/AuthLayout';
import GradientButton from '../components/GradientButton';
import TextField from '../components/TextField';
import { LockIcon, MailIcon, UserIcon } from '../components/icons';
import { emailError } from '../lib/validation';

type RegisterPageProps = {
  onSignIn: () => void;
};

type RegisterValues = {
  email: string;
  password: string;
  repeatPassword: string;
  username: string;
};

type RegisterErrors = Partial<RegisterValues>;

function validate(values: RegisterValues): RegisterErrors {
  const errors: RegisterErrors = {};

  errors.email = emailError(values.email);

  if (!values.username.trim()) {
    errors.username = 'Username is required';
  }

  if (!values.password) {
    errors.password = 'Password is required';
  }

  if (!values.repeatPassword) {
    errors.repeatPassword = 'Please repeat your password';
  } else if (values.password && values.repeatPassword !== values.password) {
    errors.repeatPassword = 'Passwords do not match';
  }

  return errors;
}

export default function RegisterPage({ onSignIn }: RegisterPageProps) {
  const [values, setValues] = useState<RegisterValues>({
    email: '',
    password: '',
    repeatPassword: '',
    username: '',
  });
  const [errors, setErrors] = useState<RegisterErrors>({});

  const setValue = (field: keyof RegisterValues) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = () => setErrors(validate(values));

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
      onSubmit={handleSubmit}
      subtitle="Start racing in just a few minutes!"
      subtitleSize="sm"
      title="Create your account"
    >
      <TextField
        autoComplete="email"
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
        className="mt-[clamp(10px,5.3vh_-_23px,34px)]"
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
        className="mt-[clamp(10px,5.3vh_-_23px,34px)]"
        error={errors.password}
        icon={<LockIcon />}
        id="register-password"
        label="Password"
        maxLength={72}
        onChange={setValue('password')}
        placeholder="••••••••••"
        type="password"
        value={values.password}
      />
      <TextField
        autoComplete="new-password"
        className="mt-[clamp(10px,5.3vh_-_23px,34px)]"
        error={errors.repeatPassword}
        icon={<LockIcon />}
        id="register-repeat-password"
        label="Repeat password"
        maxLength={72}
        onChange={setValue('repeatPassword')}
        placeholder="••••••••••"
        type="password"
        value={values.repeatPassword}
      />
      <GradientButton className="mt-[clamp(12px,9.6vh_-_48px,56px)]">
        Sign in
      </GradientButton>
    </AuthLayout>
  );
}
