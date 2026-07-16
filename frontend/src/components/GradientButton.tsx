import type { ReactNode } from 'react';

type GradientButtonProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
};

export default function GradientButton({
  children,
  className = '',
  disabled = false,
  onClick,
  type = 'submit',
}: GradientButtonProps) {
  return (
    <button
      className={`gradient-button ${className}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}
