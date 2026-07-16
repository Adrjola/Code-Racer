import { useState } from 'react';
import type { ReactNode } from 'react';
import eyeOff from '../assets/icons/eye-off.svg';
import eyeOpen from '../assets/icons/eye-open.svg';

type TextFieldProps = {
  autoComplete?: string;
  className?: string;
  error?: string;
  icon: ReactNode;
  id: string;
  label: string;
  maxLength?: number;
  onChange?: (value: string) => void;
  placeholder: string;
  type?: 'email' | 'password' | 'text';
  value?: string;
};

export default function TextField({
  autoComplete,
  className = '',
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
    <div className={className}>
      <label
        className="block text-[14px] font-semibold text-text-secondary"
        htmlFor={id}
      >
        {label}
      </label>
      <div
        className={`mt-[clamp(6px,1.1vh_-_1px,11px)] flex items-center gap-[9px] rounded-[10px] border bg-white/[0.02] px-3.5 ${
          error ? 'border-red-400/60' : 'border-pink-400/[0.22]'
        } ${
          isPassword
            ? 'h-[clamp(44px,4.4vh_+_17px,64px)]'
            : 'h-[clamp(44px,3.9vh_+_19px,62px)]'
        }`}
      >
        {icon}
        <input
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete={autoComplete}
          className={`w-full bg-transparent font-mono text-text-primary outline-none placeholder:text-text-muted ${
            isPassword ? 'text-[14.5px]' : 'text-[16px]'
          }`}
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
            className="shrink-0"
            onClick={() => setShowPassword((visible) => !visible)}
            type="button"
          >
            <img
              alt=""
              className="block h-3.5 w-4 max-w-none"
              src={showPassword ? eyeOpen : eyeOff}
            />
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-[12px] text-red-400" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
