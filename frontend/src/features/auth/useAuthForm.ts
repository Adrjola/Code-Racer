import { useState } from 'react';
import type { FormErrors } from './validation';

export function useAuthForm<T extends Record<string, string>>(
  initialValues: T,
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [formMessage, setFormMessage] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = (field: keyof T) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormMessage(undefined);
  };

  return {
    errors,
    formMessage,
    isSubmitting,
    setErrors,
    setFormMessage,
    setIsSubmitting,
    setValue,
    values,
  };
}
