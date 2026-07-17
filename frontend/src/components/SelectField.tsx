export type SelectOption = {
  label: string;
  value: string;
};

type SelectFieldProps = {
  className?: string;
  disabled?: boolean;
  error?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  value: string;
};

const labelClassName =
  'block text-sm font-semibold text-text-secondary lg:text-[14px]';

const selectClassName =
  'mt-[0.45rem] h-11 w-full rounded-[0.625rem] border border-[rgb(244_114_182_/_0.22)] bg-white/[0.02] px-3 font-mono text-sm text-text-primary outline-none disabled:cursor-not-allowed disabled:opacity-60';

export default function SelectField({
  className = '',
  disabled = false,
  error,
  id,
  label,
  onChange,
  options,
  placeholder,
  value,
}: SelectFieldProps) {
  return (
    <div className={className}>
      <label className={labelClassName} htmlFor={id}>
        {label}
      </label>
      <select
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={error ? true : undefined}
        className={`${selectClassName} ${error ? 'border-red-400/60' : ''}`}
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {placeholder !== undefined && (
          <option className="bg-surface" value="">
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            className="bg-surface"
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1.5 text-xs text-red-400" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
