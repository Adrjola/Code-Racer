import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createSnippet,
  deleteSnippet,
  listSnippets,
  type Snippet,
} from './api';
import { saveSession } from '@/features/auth/session';
import { server } from '@/test/server';

const API_URL = 'http://localhost:8080';

const snippet: Snippet = {
  category: 'JAVA',
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
      id: '019f66a0-981f-7368-aec1-4e814cc269f9',
      role: 'ADMIN',
      updatedAt: '2026-07-16T12:00:00Z',
      username: 'admin',
    },
  });
});

describe('admin api', () => {
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
      category: snippet.category,
      difficulty: 'EASY',
      source: snippet.source,
      title: snippet.title,
    });

    expect(body).not.toHaveProperty('version');
    expect(body).toMatchObject({ title: snippet.title });
  });

  it('soft-deletes a snippet', async () => {
    server.use(
      http.delete(`${API_URL}/api/admin/snippets/${snippet.id}`, () =>
        HttpResponse.text(null, { status: 204 }),
      ),
    );

    await expect(deleteSnippet(snippet.id)).resolves.toBeUndefined();
  });
});
