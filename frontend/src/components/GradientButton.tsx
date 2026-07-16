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
      className={`flex h-[clamp(44px,5vh_+_13px,67px)] w-full items-center justify-center rounded-[10px] bg-gradient-to-br from-pink-400 to-purple-500 text-[16px] font-bold text-white shadow-[0px_0px_28px_-6px_rgba(219,39,119,0.85)] transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}
