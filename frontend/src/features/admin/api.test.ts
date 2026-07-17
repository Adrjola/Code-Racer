import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  activateSnippet,
  createCategory,
  createSnippet,
  deactivateSnippet,
  deleteCategory,
  deleteSnippet,
  listCategories,
  listSnippets,
  restoreCategory,
  restoreSnippet,
  updateCategory,
  updateSnippet,
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
  revisionNumber: 1,
  snippetId: '019f66a0-981f-7368-aec1-4e814cc269f2',
  source: 'int a = 1;',
  title: 'FizzBuzz',
  updatedAt: '2026-07-16T12:00:00Z',
  version: 0,
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

  it('echoes the version back when updating a snippet', async () => {
    let body: unknown;
    server.use(
      http.put(
        `${API_URL}/api/admin/snippets/${snippet.id}`,
        async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ data: { ...snippet, revisionNumber: 2 } });
        },
      ),
    );

    const updated = await updateSnippet(
      snippet.id,
      {
        categoryId: snippet.categoryId,
        difficulty: 'HARD',
        source: 'int b = 2;',
        title: snippet.title,
      },
      7,
    );

    expect(body).toMatchObject({ difficulty: 'HARD', version: 7 });
    expect(updated.revisionNumber).toBe(2);
  });

  it('creates a snippet without sending a version', async () => {
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
  });

  it('posts lifecycle actions without a body', async () => {
    server.use(
      http.post(`${API_URL}/api/admin/snippets/${snippet.id}/deactivate`, () =>
        HttpResponse.json({ data: { ...snippet, lifecycle: 'INACTIVE' } }),
      ),
    );

    await expect(deactivateSnippet(snippet.id)).resolves.toMatchObject({
      lifecycle: 'INACTIVE',
    });
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

  it('activates and restores a snippet through its lifecycle routes', async () => {
    server.use(
      http.post(`${API_URL}/api/admin/snippets/${snippet.id}/activate`, () =>
        HttpResponse.json({ data: { ...snippet, lifecycle: 'ACTIVE' } }),
      ),
      http.post(`${API_URL}/api/admin/snippets/${snippet.id}/restore`, () =>
        HttpResponse.json({ data: { ...snippet, lifecycle: 'INACTIVE' } }),
      ),
    );

    await expect(activateSnippet(snippet.id)).resolves.toMatchObject({
      lifecycle: 'ACTIVE',
    });
    await expect(restoreSnippet(snippet.id)).resolves.toMatchObject({
      lifecycle: 'INACTIVE',
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
