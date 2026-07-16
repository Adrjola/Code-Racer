import { useState } from 'react';
import type { ReactNode } from 'react';
import eyeOff from '../assets/icons/eye-off.svg';
import eyeOpen from '../assets/icons/eye-open.svg';

type TextFieldProps = {
  autoComplete?: string;
  className?: string;
  disabled?: boolean;
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
    <div className={`field-group ${className}`}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className={`field-control ${error ? 'field-control--error' : ''}`}>
        {icon}
        <input
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete={autoComplete}
          className={`field-input ${isPassword ? 'field-input--password' : ''}`}
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
            className="field-toggle"
            disabled={disabled}
            onClick={() => setShowPassword((visible) => !visible)}
            type="button"
          >
            <img
              alt=""
              className="field-toggle-icon"
              src={showPassword ? eyeOpen : eyeOff}
            />
          </button>
        )}
      </div>
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
