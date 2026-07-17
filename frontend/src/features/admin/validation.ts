import type { CategoryValues } from './api';

export type FormErrors<T> = Partial<Record<keyof T, string>>;

export const CATEGORY_NAME_MAX = 100;
export const CATEGORY_DESCRIPTION_MAX = 500;

export function categoryNameError(value: string): string | undefined {
  if (!value.trim()) {
    return 'Name is required';
  }
  if (value.length > CATEGORY_NAME_MAX) {
    return `Name must be ${CATEGORY_NAME_MAX} characters or fewer`;
  }
  return undefined;
}

export function categoryDescriptionError(value: string): string | undefined {
  if (value.length > CATEGORY_DESCRIPTION_MAX) {
    return `Description must be ${CATEGORY_DESCRIPTION_MAX} characters or fewer`;
  }
  return undefined;
}

export function validateCategory(
  values: CategoryValues,
): FormErrors<CategoryValues> {
  return {
    description: categoryDescriptionError(values.description),
    name: categoryNameError(values.name),
  };
}

export function hasFormErrors<T extends object>(
  errors: FormErrors<T>,
): boolean {
  return Object.values(errors).some(Boolean);
}
