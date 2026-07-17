import { apiRequest, type BaseResponse, type Page } from '@/lib/apiClient';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type SnippetLifecycle = 'ACTIVE' | 'INACTIVE' | 'RETIRED' | 'DELETED';

export type Category = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CategoryValues = {
  name: string;
  description: string;
};

export type Snippet = {
  id: string;
  snippetId: string;
  revisionNumber: number;
  title: string;
  source: string;
  difficulty: Difficulty;
  lifecycle: SnippetLifecycle;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type SnippetValues = {
  title: string;
  source: string;
  difficulty: Difficulty;
  categoryId: string;
};

export type SnippetFilters = {
  categoryId?: string;
  difficulty?: Difficulty;
  lifecycle?: SnippetLifecycle;
};

export type PageRequest = {
  page?: number;
  size?: number;
};

export function listCategories(pageRequest: PageRequest = {}) {
  return get<Page<Category>>('/api/admin/categories', pageRequest);
}

export function createCategory(values: CategoryValues) {
  return send<Category>('/api/admin/categories', 'POST', values);
}

export function updateCategory(id: string, values: CategoryValues) {
  return send<Category>(`/api/admin/categories/${id}`, 'PUT', values);
}

export function restoreCategory(id: string) {
  return send<Category>(`/api/admin/categories/${id}/restore`, 'POST');
}

/** Soft-deletes the category, which is how a category is deactivated. */
export function deleteCategory(id: string) {
  return apiRequest<void>(`/api/admin/categories/${id}`, {
    auth: true,
    method: 'DELETE',
  });
}

export function listSnippets(
  filters: SnippetFilters = {},
  pageRequest: PageRequest = {},
) {
  return get<Page<Snippet>>('/api/admin/snippets', {
    ...filters,
    ...pageRequest,
  });
}

export function createSnippet(values: SnippetValues) {
  return send<Snippet>('/api/admin/snippets', 'POST', values);
}

export function updateSnippet(
  id: string,
  values: SnippetValues,
  version: number,
) {
  return send<Snippet>(`/api/admin/snippets/${id}`, 'PUT', {
    ...values,
    version,
  });
}

export function activateSnippet(id: string) {
  return send<Snippet>(`/api/admin/snippets/${id}/activate`, 'POST');
}

export function deactivateSnippet(id: string) {
  return send<Snippet>(`/api/admin/snippets/${id}/deactivate`, 'POST');
}

export function restoreSnippet(id: string) {
  return send<Snippet>(`/api/admin/snippets/${id}/restore`, 'POST');
}

export function deleteSnippet(id: string) {
  return apiRequest<void>(`/api/admin/snippets/${id}`, {
    auth: true,
    method: 'DELETE',
  });
}

async function get<T>(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<T> {
  const response = await apiRequest<BaseResponse<T>>(
    `${path}${toQuery(params)}`,
    { auth: true },
  );

  return response.data;
}

async function send<T>(
  path: string,
  method: 'POST' | 'PUT',
  body?: unknown,
): Promise<T> {
  const response = await apiRequest<BaseResponse<T>>(path, {
    auth: true,
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  return response.data;
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}
