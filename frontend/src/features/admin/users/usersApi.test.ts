import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  deleteUser,
  listUsers,
  restoreUser,
  updateUser,
  type AdminUser,
} from './usersApi';
import { saveSession } from '@/features/auth/session';
import { server } from '@/test/server';

const API_URL = 'http://localhost:8080';
const USERS_URL = `${API_URL}/api/admin/users`;

const user: AdminUser = {
  createdAt: '2026-07-16T12:00:00Z',
  deleted: false,
  email: 'player@example.com',
  emailVerified: true,
  id: '019f66a0-981f-7368-aec1-4e814cc269f1',
  role: 'USER',
  updatedAt: '2026-07-16T12:00:00Z',
  username: 'player1',
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

describe('usersApi', () => {
  it('omits filters that are not set and includes those that are', async () => {
    let url = '';
    server.use(
      http.get(USERS_URL, ({ request }) => {
        url = request.url;
        return HttpResponse.json({
          data: {
            content: [user],
            page: { number: 0, size: 10, totalElements: 1, totalPages: 1 },
          },
        });
      }),
    );

    await listUsers({ deleted: false, role: 'ADMIN' }, { page: 0 });

    expect(url).toContain('role=ADMIN');
    expect(url).toContain('deleted=false');
    expect(url).not.toContain('emailVerified');
  });

  it('maps only the known response fields, dropping unexpected ones', async () => {
    server.use(
      http.get(USERS_URL, () =>
        HttpResponse.json({
          data: {
            content: [{ ...user, passwordHash: 'super-secret-hash' }],
            page: { number: 0, size: 10, totalElements: 1, totalPages: 1 },
          },
        }),
      ),
    );

    const result = await listUsers();

    expect(result.content[0]).not.toHaveProperty('passwordHash');
    expect(result.content[0]).toEqual(user);
  });

  it('soft-deletes a user', async () => {
    server.use(
      http.delete(`${USERS_URL}/${user.id}`, () =>
        HttpResponse.text(null, { status: 204 }),
      ),
    );

    await expect(deleteUser(user.id)).resolves.toBeUndefined();
  });

  it('restores a user', async () => {
    server.use(
      http.post(`${USERS_URL}/${user.id}/restore`, () =>
        HttpResponse.json({ data: { ...user, deleted: false } }),
      ),
    );

    const restored = await restoreUser(user.id);
    expect(restored.deleted).toBe(false);
  });

  it('sends a PUT with the edited fields and maps the response', async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.put(`${USERS_URL}/${user.id}`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          data: { ...user, email: 'new@example.com', username: 'newname' },
        });
      }),
    );

    const updated = await updateUser(user.id, {
      email: 'new@example.com',
      username: 'newname',
    });

    expect(body).toEqual({ email: 'new@example.com', username: 'newname' });
    expect(updated.username).toBe('newname');
    expect(updated.email).toBe('new@example.com');
  });
});
