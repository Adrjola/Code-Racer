import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createCategory,
  createSnippet,
  deleteCategory,
  deleteSnippet,
  listCategories,
  listSnippets,
  restoreCategory,
  updateCategory,
  type Snippet,
} from './api';
import { saveSession } from '@/features/auth/session';
import { server } from '@/test/server';

const API_URL = 'http://localhost:8080';

const snippet: Snippet = {
  categoryId: '019f66a0-981f-7368-aec1-4e814cc269f3',
  createdAt: '2026-07-16T12:00:00Z',
  difficulty: 'EASY',
  id: '019f66a0-981f-7368-aec1-4e814cc269f1',
  lifecycle: 'ACTIVE',
  source: 'int a = 1;',
  title: 'FizzBuzz',
  updatedAt: '2026-07-16T12:00:00Z',
};

beforeEach(() => {
  saveSession({
    accessToken: 'jwt-token',
    expiresAt: Date.now() + 60_000,
    tokenType: 'Bearer',
    user: {
      createdAt: '2026-07-16T12:00:00Z',
      email: 'admin@example.com',
      emailVerified: true,
      enabled: true,
      id: '019f66a0-981f-7368-aec1-4e814cc269f9',
      role: 'ADMIN',
      updatedAt: '2026-07-16T12:00:00Z',
      username: 'admin',
    },
  });
});

describe('admin api', () => {
  it('unwraps the BaseResponse envelope when listing categories', async () => {
    server.use(
      http.get(`${API_URL}/api/admin/categories`, () =>
        HttpResponse.json({
          data: {
            content: [],
            page: { number: 0, size: 20, totalElements: 0, totalPages: 0 },
          },
        }),
      ),
    );

    await expect(listCategories()).resolves.toMatchObject({ content: [] });
  });

  it('sends pagination parameters', async () => {
    let url = '';
    server.use(
      http.get(`${API_URL}/api/admin/categories`, ({ request }) => {
        url = request.url;
        return HttpResponse.json({
          data: {
            content: [],
            page: { number: 2, size: 5, totalElements: 0, totalPages: 0 },
          },
        });
      }),
    );

    await listCategories({ page: 2, size: 5 });

    expect(url).toContain('page=2');
    expect(url).toContain('size=5');
  });

  it('omits snippet filters that are not set', async () => {
    let url = '';
    server.use(
      http.get(`${API_URL}/api/admin/snippets`, ({ request }) => {
        url = request.url;
        return HttpResponse.json({
          data: {
            content: [snippet],
            page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
          },
        });
      }),
    );

    await listSnippets({ difficulty: 'HARD' }, { page: 0 });

    expect(url).toContain('difficulty=HARD');
    expect(url).not.toContain('categoryId');
    expect(url).not.toContain('lifecycle');
  });

  it('creates a snippet', async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post(`${API_URL}/api/admin/snippets`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: snippet }, { status: 201 });
      }),
    );

    await createSnippet({
      categoryId: snippet.categoryId,
      difficulty: 'EASY',
      source: snippet.source,
      title: snippet.title,
    });

    expect(body).not.toHaveProperty('version');
    expect(body).toMatchObject({ title: snippet.title });
  });

  it('treats a category delete as a 204 with no body', async () => {
    server.use(
      http.delete(`${API_URL}/api/admin/categories/${snippet.categoryId}`, () =>
        HttpResponse.text(null, { status: 204 }),
      ),
    );

    await expect(deleteCategory(snippet.categoryId)).resolves.toBeUndefined();
  });

  it('creates a category from the name and description', async () => {
    let body: unknown;
    server.use(
      http.post(`${API_URL}/api/admin/categories`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          {
            data: {
              active: true,
              createdAt: '2026-07-16T12:00:00Z',
              description: 'Java exercises',
              id: snippet.categoryId,
              name: 'Java',
              updatedAt: '2026-07-16T12:00:00Z',
            },
          },
          { status: 201 },
        );
      }),
    );

    const created = await createCategory({
      description: 'Java exercises',
      name: 'Java',
    });

    expect(body).toEqual({ description: 'Java exercises', name: 'Java' });
    expect(created.active).toBe(true);
  });

  it('restores a category back to active', async () => {
    server.use(
      http.post(
        `${API_URL}/api/admin/categories/${snippet.categoryId}/restore`,
        () =>
          HttpResponse.json({
            data: {
              active: true,
              createdAt: '2026-07-16T12:00:00Z',
              description: '',
              id: snippet.categoryId,
              name: 'Java',
              updatedAt: '2026-07-16T12:00:00Z',
            },
          }),
      ),
    );

    await expect(restoreCategory(snippet.categoryId)).resolves.toMatchObject({
      active: true,
    });
  });

  it('soft-deletes a snippet', async () => {
    server.use(
      http.delete(`${API_URL}/api/admin/snippets/${snippet.id}`, () =>
        HttpResponse.text(null, { status: 204 }),
      ),
    );

    await expect(deleteSnippet(snippet.id)).resolves.toBeUndefined();
  });

  it('surfaces a conflict when updating a stale category', async () => {
    server.use(
      http.put(`${API_URL}/api/admin/categories/${snippet.categoryId}`, () =>
        HttpResponse.json(
          {
            code: 'CONFLICT',
            message: "Category with name 'Java' already exists",
            status: 409,
          },
          { status: 409 },
        ),
      ),
    );

    await expect(
      updateCategory(snippet.categoryId, { description: '', name: 'Java' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});
