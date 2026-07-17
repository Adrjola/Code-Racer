import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import CategoriesPage from './CategoriesPage';
import { saveSession } from '@/features/auth/session';
import { server } from '@/test/server';

const API_URL = 'http://localhost:8080';
const CATEGORIES_URL = `${API_URL}/api/admin/categories`;

const java = {
  active: true,
  createdAt: '2026-07-16T12:00:00Z',
  description: 'Java exercises',
  id: '019f66a0-981f-7368-aec1-4e814cc269f1',
  name: 'Java basics',
  updatedAt: '2026-07-16T12:00:00Z',
};

const retired = {
  ...java,
  active: false,
  description: 'Retired topic',
  id: 'b2',
  name: 'Old topic',
};

function pageOf(content: unknown[], overrides = {}) {
  return {
    data: {
      content,
      page: {
        number: 0,
        size: 10,
        totalElements: content.length,
        totalPages: 1,
        ...overrides,
      },
    },
  };
}

function respondWith(content: unknown[], overrides = {}) {
  server.use(
    http.get(CATEGORIES_URL, () =>
      HttpResponse.json(pageOf(content, overrides)),
    ),
  );
}

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
      id: 'u1',
      role: 'ADMIN',
      updatedAt: '2026-07-16T12:00:00Z',
      username: 'admin',
    },
  });
});

describe('CategoriesPage', () => {
  it('lists categories with their status', async () => {
    respondWith([java, retired]);
    render(<CategoriesPage />);

    expect(await screen.findByText('Java basics')).toBeInTheDocument();
    expect(screen.getByText('Java exercises')).toBeInTheDocument();

    const [activeCard, disabledCard] = screen.getAllByRole('listitem');
    expect(within(activeCard).getByText('Active')).toBeInTheDocument();
    expect(within(disabledCard).getByText('Disabled')).toBeInTheDocument();
  });

  it('shows an empty state when there are no categories', async () => {
    respondWith([]);
    render(<CategoriesPage />);

    expect(await screen.findByText(/No categories yet/)).toBeInTheDocument();
  });

  it('reports a load failure and retries', async () => {
    let calls = 0;
    server.use(
      http.get(CATEGORIES_URL, () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.error()
          : HttpResponse.json(pageOf([java]));
      }),
    );
    render(<CategoriesPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Cannot reach the server/,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Java basics')).toBeInTheDocument();
  });

  it('creates a category and reloads the list', async () => {
    respondWith([]);
    let created: unknown;
    server.use(
      http.post(CATEGORIES_URL, async ({ request }) => {
        created = await request.json();
        server.use(
          http.get(CATEGORIES_URL, () => HttpResponse.json(pageOf([java]))),
        );
        return HttpResponse.json({ data: java }, { status: 201 });
      }),
    );
    render(<CategoriesPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'New category' }),
    );
    await userEvent.type(screen.getByLabelText('Name'), 'Java basics');
    await userEvent.type(
      screen.getByLabelText('Description'),
      'Java exercises',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(created).toEqual({
        description: 'Java exercises',
        name: 'Java basics',
      }),
    );
    expect(await screen.findByText('Java basics')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('blocks submitting a category without a name', async () => {
    respondWith([]);
    let posted = false;
    server.use(
      http.post(CATEGORIES_URL, () => {
        posted = true;
        return HttpResponse.json({ data: java }, { status: 201 });
      }),
    );
    render(<CategoriesPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'New category' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(posted).toBe(false);
  });

  it('keeps the dialog open and shows a duplicate name conflict', async () => {
    respondWith([]);
    server.use(
      http.post(CATEGORIES_URL, () =>
        HttpResponse.json(
          {
            code: 'CONFLICT',
            message: "Category with name 'Java basics' already exists",
            status: 409,
          },
          { status: 409 },
        ),
      ),
    );
    render(<CategoriesPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'New category' }),
    );
    await userEvent.type(screen.getByLabelText('Name'), 'Java basics');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /already exists/,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('edits a category through the prefilled form', async () => {
    respondWith([java]);
    let sent: unknown;
    server.use(
      http.put(`${CATEGORIES_URL}/${java.id}`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ data: { ...java, name: 'Java core' } });
      }),
    );
    render(<CategoriesPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Name')).toHaveValue('Java basics');

    await userEvent.clear(screen.getByLabelText('Name'));
    await userEvent.type(screen.getByLabelText('Name'), 'Java core');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(sent).toEqual({
        description: 'Java exercises',
        name: 'Java core',
      }),
    );
  });

  it('disables an active category after confirmation', async () => {
    respondWith([java]);
    let deleted = false;
    server.use(
      http.delete(`${CATEGORIES_URL}/${java.id}`, () => {
        deleted = true;
        return HttpResponse.text(null, { status: 204 });
      }),
    );
    render(<CategoriesPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Disable' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Disable category' }),
    ).toHaveAccessibleDescription(/stays on the snippets already using it/);

    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Disable',
      }),
    );

    await waitFor(() => expect(deleted).toBe(true));
  });

  it('does not disable when the confirmation is cancelled', async () => {
    respondWith([java]);
    let deleted = false;
    server.use(
      http.delete(`${CATEGORIES_URL}/${java.id}`, () => {
        deleted = true;
        return HttpResponse.text(null, { status: 204 });
      }),
    );
    render(<CategoriesPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Disable' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(deleted).toBe(false);
  });

  it('restores a disabled category', async () => {
    respondWith([retired]);
    let restored = false;
    server.use(
      http.post(`${CATEGORIES_URL}/${retired.id}/restore`, () => {
        restored = true;
        return HttpResponse.json({ data: { ...retired, active: true } });
      }),
    );
    render(<CategoriesPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Restore' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Restore',
      }),
    );

    await waitFor(() => expect(restored).toBe(true));
  });

  it('pages through results', async () => {
    const urls: string[] = [];
    server.use(
      http.get(CATEGORIES_URL, ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json(
          pageOf([java], { totalElements: 12, totalPages: 2 }),
        );
      }),
    );
    render(<CategoriesPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Next' }));

    await waitFor(() => expect(urls.at(-1)).toContain('page=1'));
  });
});
