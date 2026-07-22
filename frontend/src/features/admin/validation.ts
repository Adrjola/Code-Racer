import type { SnippetValues } from './api';

export type FormErrors<T> = Partial<Record<keyof T, string>>;

export const SNIPPET_TITLE_MAX = 200;
export const SNIPPET_SOURCE_MAX = 10000;

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
    category: values.category ? undefined : 'Category is required',
    source: snippetSourceError(values.source),
    title: snippetTitleError(values.title),
  };
}

export function hasFormErrors<T extends object>(
  errors: FormErrors<T>,
): boolean {
  return Object.values(errors).some(Boolean);
}
