import type { ReactNode } from 'react';

type GradientButtonProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
};

const buttonClassName =
  'flex h-[clamp(3.25rem,6dvh,4rem)] w-full items-center justify-center rounded-[0.625rem] bg-gradient-to-br from-pink-400 to-purple-500 text-base font-bold text-white shadow-[0_0_28px_-6px_rgb(219_39_119_/_0.85)] transition duration-150 ease-out hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 lg:h-[67px] lg:rounded-[10px] lg:text-[16px]';

export default function GradientButton({
  children,
  className = '',
  disabled = false,
  onClick,
  type = 'submit',
}: GradientButtonProps) {
  return (
    <button
      className={`${buttonClassName} ${className}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}
