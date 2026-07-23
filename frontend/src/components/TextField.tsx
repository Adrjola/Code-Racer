import { useState } from 'react';
import type { ReactNode } from 'react';
import eyeOff from '../assets/icons/eye-off.svg';
import eyeOpen from '../assets/icons/eye-open.svg';

type TextFieldProps = {
  autoComplete?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
  icon?: ReactNode;
  id: string;
  label: string;
  maxLength?: number;
  onChange?: (value: string) => void;
  placeholder: string;
  type?: 'email' | 'password' | 'text';
  value?: string;
};

const rootClassName =
  '[&:not(:first-child)]:mt-[clamp(1.25rem,3.2dvh,2.125rem)] lg:[&:not(:first-child)]:mt-[33px]';

const labelClassName =
  'block text-sm font-semibold text-text-secondary lg:text-[14px] lg:leading-[19px]';

const controlClassName =
  'mt-[clamp(0.45rem,1.1dvh,0.6875rem)] flex h-[clamp(3.25rem,5.6dvh,3.875rem)] items-center gap-[0.5625rem] rounded-[0.625rem] border border-[rgb(244_114_182_/_0.22)] bg-white/[0.02] px-[0.875rem] lg:mt-[11px] lg:h-[62px] lg:gap-[9px] lg:px-[14px]';

const inputClassName =
  'w-full min-w-0 bg-transparent font-mono text-[clamp(0.875rem,0.8rem_+_0.2vw,1rem)] text-text-primary outline-none placeholder:text-text-muted disabled:cursor-not-allowed lg:text-[16px]';

export default function TextField({
  autoComplete,
  className = '',
  disabled = false,
  error,
  icon,
  id,
  label,
  maxLength,
  onChange,
  placeholder,
  type = 'text',
  value,
}: TextFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  return (
    <div className={`${rootClassName} ${className}`}>
      <label className={labelClassName} htmlFor={id}>
        {label}
      </label>
      <div
        className={`${controlClassName} ${error ? 'border-red-400/60' : ''}`}
      >
        {icon}
        <input
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete={autoComplete}
          className={`${inputClassName} ${
            isPassword ? 'text-[0.90625rem] lg:text-[14.5px]' : ''
          }`}
          disabled={disabled}
          id={id}
          maxLength={maxLength}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          type={inputType}
          value={value}
        />
        {isPassword && (
          <button
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="shrink-0 disabled:cursor-not-allowed"
            disabled={disabled}
            onClick={() => setShowPassword((visible) => !visible)}
            type="button"
          >
            <img
              alt=""
              className="block h-[0.875rem] w-4 max-w-none"
              src={showPassword ? eyeOpen : eyeOff}
            />
          </button>
        )}
      </div>
      {error && (
        <p
          className="mt-1.5 text-xs leading-[1.35] text-red-400"
          id={`${id}-error`}
        >
          {error}
        </p>
      )}
    </div>
  );
}
