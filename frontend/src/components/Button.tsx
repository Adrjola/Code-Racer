import type { ReactNode } from 'react';

export type ButtonVariant = 'danger' | 'ghost' | 'primary' | 'secondary';

type ButtonProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: ButtonVariant;
};

const baseClassName =
  'inline-flex h-10 items-center justify-center rounded-[8px] px-4 text-sm font-semibold transition duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-60';

const variantClassName: Record<ButtonVariant, string> = {
  danger:
    'border border-red-400/35 text-red-300 hover:border-red-400/60 hover:text-red-200',
  ghost: 'text-text-secondary hover:text-text-primary',
  primary:
    'bg-gradient-to-br from-pink-400 to-purple-500 text-white shadow-[0_0_20px_-6px_rgb(219_39_119_/_0.85)] hover:opacity-95',
  secondary:
    'border border-pink-400/30 text-pink-300 hover:border-pink-400/60 hover:text-pink-200',
};

export default function Button({
  children,
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  variant = 'secondary',
}: ButtonProps) {
  return (
    <button
      className={`${baseClassName} ${variantClassName[variant]} ${className}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}
