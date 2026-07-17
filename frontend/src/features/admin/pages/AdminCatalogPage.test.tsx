import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import AdminCatalogPage from './AdminCatalogPage';
import { saveSession } from '@/features/auth/session';
import { server } from '@/test/server';

const API_URL = 'http://localhost:8080';

const emptyPage = {
  data: {
    content: [],
    page: { number: 0, size: 10, totalElements: 0, totalPages: 0 },
  },
};

beforeEach(() => {
  server.use(
    http.get(`${API_URL}/api/admin/categories`, () =>
      HttpResponse.json(emptyPage),
    ),
    http.get(`${API_URL}/api/admin/snippets`, () =>
      HttpResponse.json(emptyPage),
    ),
  );
  saveSession({
    accessToken: 'jwt-token',
    expiresAt: Date.now() + 60_000,
    tokenType: 'Bearer',
    user: {
      createdAt: '2026-07-16T12:00:00Z',
      email: 'admin@example.com',
      emailVerified: true,
      enabled: true,
      id: 'u1',
      role: 'ADMIN',
      updatedAt: '2026-07-16T12:00:00Z',
      username: 'admin',
    },
  });
});

describe('AdminCatalogPage', () => {
  it('opens on categories', async () => {
    render(<AdminCatalogPage />);

    expect(
      await screen.findByRole('heading', { name: 'Categories' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Categories' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('switches to snippets', async () => {
    render(<AdminCatalogPage />);

    await userEvent.click(screen.getByRole('tab', { name: 'Snippets' }));

    expect(
      await screen.findByRole('heading', { name: 'Snippets' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Categories' }),
    ).not.toBeInTheDocument();
  });
});
