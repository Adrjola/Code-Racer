import { useState } from 'react';
import AuthLayout from '../components/AuthLayout';
import GradientButton from '../components/GradientButton';
import TextField from '../components/TextField';
import { MailIcon } from '../components/icons';
import { emailError } from '../lib/validation';

type ForgotPasswordPageProps = {
  onBackToLogin: () => void;
};

export default function ForgotPasswordPage({
  onBackToLogin,
}: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();

  const handleChange = (value: string) => {
    setEmail(value);
    setError(undefined);
  };

  const handleSubmit = () => setError(emailError(email));

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
      <GradientButton className="mt-[clamp(12px,9.6vh_-_48px,56px)]">
        Send reset link
      </GradientButton>
    </AuthLayout>
  );
}
