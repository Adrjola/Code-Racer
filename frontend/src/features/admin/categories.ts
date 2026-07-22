import type { Category } from './api';

/**
 * The fixed catalog, mirroring the backend's Category enum. Adding a category
 * means adding it here and to the enum.
 */
export const CATEGORY_OPTIONS: { category: Category; displayName: string }[] = [
  { category: 'JAVA', displayName: 'Java' },
  { category: 'SQL', displayName: 'SQL' },
  { category: 'REST_APIS', displayName: 'REST APIs' },
  { category: 'TESTING', displayName: 'Testing' },
];

export function categoryDisplayName(category: Category): string {
  return (
    CATEGORY_OPTIONS.find((option) => option.category === category)
      ?.displayName ?? category
  );
}
