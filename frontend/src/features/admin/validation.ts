import type { CategoryValues, SnippetValues } from './api';

export type FormErrors<T> = Partial<Record<keyof T, string>>;

export const CATEGORY_NAME_MAX = 100;
export const CATEGORY_DESCRIPTION_MAX = 500;
export const SNIPPET_TITLE_MAX = 200;
export const SNIPPET_SOURCE_MAX = 10000;

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

export function canonicalizeSource(source: string): string {
  return source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function snippetTitleError(value: string): string | undefined {
  if (!value.trim()) {
    return 'Title is required';
  }
  if ([...value].length > SNIPPET_TITLE_MAX) {
    return `Title must be ${SNIPPET_TITLE_MAX} characters or fewer`;
  }
  return undefined;
}

export function snippetSourceError(value: string): string | undefined {
  if (!value.trim()) {
    return 'Code is required';
  }
  if ([...canonicalizeSource(value)].length > SNIPPET_SOURCE_MAX) {
    return `Code must be ${SNIPPET_SOURCE_MAX} characters or fewer`;
  }
  return undefined;
}

export function validateSnippet(
  values: SnippetValues,
): FormErrors<SnippetValues> {
  return {
    categoryId: values.categoryId ? undefined : 'Category is required',
    source: snippetSourceError(values.source),
    title: snippetTitleError(values.title),
  };
}

export function hasFormErrors<T extends object>(
  errors: FormErrors<T>,
): boolean {
  return Object.values(errors).some(Boolean);
}
