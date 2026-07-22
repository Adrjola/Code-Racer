import { apiRequest, type BaseResponse, type Page } from '@/lib/apiClient';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type SnippetLifecycle = 'ACTIVE' | 'DELETED';

export type Category = 'JAVA' | 'REST_APIS' | 'SQL' | 'TESTING';

export type Snippet = {
  id: string;
  title: string;
  source: string;
  difficulty: Difficulty;
  lifecycle: SnippetLifecycle;
  category: Category;
  createdAt: string;
  updatedAt: string;
};

export type SnippetValues = {
  title: string;
  source: string;
  difficulty: Difficulty;
  category: Category | '';
};

export type SnippetFilters = {
  category?: Category;
  difficulty?: Difficulty;
  lifecycle?: SnippetLifecycle;
};

export type PageRequest = {
  page?: number;
  size?: number;
};

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
