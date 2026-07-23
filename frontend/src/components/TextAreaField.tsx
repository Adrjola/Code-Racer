type TextAreaFieldProps = {
  className?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
  id: string;
  label: string;
  maxLength?: number;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  spellCheck?: boolean;
  value: string;
};

const labelClassName =
  'block text-sm font-semibold text-text-secondary lg:text-[14px]';

const textAreaClassName =
  'mt-[0.45rem] w-full resize-y rounded-[0.625rem] border border-[rgb(244_114_182_/_0.22)] bg-white/[0.02] px-3 py-2.5 font-mono text-sm leading-[1.6] text-text-primary outline-none placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-60';

export default function TextAreaField({
  className = '',
  disabled = false,
  error,
  hint,
  id,
  label,
  maxLength,
  onChange,
  placeholder,
  rows = 4,
  spellCheck,
  value,
}: TextAreaFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={className}>
      <label className={labelClassName} htmlFor={id}>
        {label}
      </label>
      <textarea
        aria-describedby={
          [errorId, hintId].filter(Boolean).join(' ') || undefined
        }
        aria-invalid={error ? true : undefined}
        className={`${textAreaClassName} ${error ? 'border-red-400/60' : ''}`}
        disabled={disabled}
        id={id}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        spellCheck={spellCheck}
        value={value}
      />
      {hint && (
        <p className="mt-1.5 text-xs text-text-muted" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-red-400" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
