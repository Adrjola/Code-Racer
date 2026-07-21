import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import SnippetsPage from './SnippetsPage';
import { saveSession } from '@/features/auth/session';
import { server } from '@/test/server';

const API_URL = 'http://localhost:8080';
const SNIPPETS_URL = `${API_URL}/api/admin/snippets`;
const CATEGORIES_URL = `${API_URL}/api/admin/categories`;

const javaCategory = {
  active: true,
  createdAt: '2026-07-16T12:00:00Z',
  description: 'Java exercises',
  id: 'c1',
  name: 'Java basics',
  updatedAt: '2026-07-16T12:00:00Z',
};

const disabledCategory = {
  ...javaCategory,
  active: false,
  description: 'No longer used',
  id: 'c2',
  name: 'Old topic',
};

const active = {
  categoryId: 'c1',
  createdAt: '2026-07-16T12:00:00Z',
  difficulty: 'EASY' as const,
  id: 's1',
  lifecycle: 'ACTIVE' as const,
  source: 'int a = 1;',
  title: 'FizzBuzz',
  updatedAt: '2026-07-16T12:00:00Z',
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

function withSnippets(content: unknown[], overrides = {}) {
  server.use(
    http.get(CATEGORIES_URL, () =>
      HttpResponse.json(pageOf([javaCategory, disabledCategory])),
    ),
    http.get(SNIPPETS_URL, () => HttpResponse.json(pageOf(content, overrides))),
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
      id: 'u1',
      role: 'ADMIN',
      updatedAt: '2026-07-16T12:00:00Z',
      username: 'admin',
    },
  });
});

describe('SnippetsPage', () => {
  it('lists snippets with lifecycle and category', async () => {
    withSnippets([active]);
    render(<SnippetsPage />);

    expect(await screen.findByText('FizzBuzz')).toBeInTheDocument();
    const card = screen.getByRole('listitem');
    expect(within(card).getByText('Active')).toBeInTheDocument();
    await waitFor(() =>
      expect(within(card).getByText(/Java basics/)).toBeInTheDocument(),
    );
  });

  it('shows an empty state for filters that match nothing', async () => {
    withSnippets([]);
    render(<SnippetsPage />);

    expect(
      await screen.findByText(/No snippets match these filters/),
    ).toBeInTheDocument();
  });

  it('sends the chosen filters and resets to the first page', async () => {
    const urls: string[] = [];
    server.use(
      http.get(CATEGORIES_URL, () => HttpResponse.json(pageOf([javaCategory]))),
      http.get(SNIPPETS_URL, ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json(
          pageOf([active], { totalElements: 12, totalPages: 2 }),
        );
      }),
    );
    render(<SnippetsPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Next' }));
    await waitFor(() => expect(urls.at(-1)).toContain('page=1'));

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'DELETED');

    await waitFor(() => {
      expect(urls.at(-1)).toContain('lifecycle=DELETED');
      expect(urls.at(-1)).toContain('page=0');
    });
  });

  it('creates a snippet and never offers editing', async () => {
    withSnippets([active]);
    let created: Record<string, unknown> = {};
    server.use(
      http.post(SNIPPETS_URL, async ({ request }) => {
        created = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: active }, { status: 201 });
      }),
    );
    render(<SnippetsPage />);

    await screen.findByText('FizzBuzz');
    // Immutable snippets: there is no way to edit an existing one.
    expect(
      screen.queryByRole('button', { name: 'Edit' }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'New snippet' }));
    await userEvent.type(screen.getByLabelText('Title'), 'Sum');
    await userEvent.selectOptions(
      within(screen.getByRole('dialog')).getByLabelText('Category'),
      'c1',
    );
    await userEvent.type(screen.getByLabelText('Code'), 'int b = 2;');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(created).toMatchObject({ categoryId: 'c1', title: 'Sum' }),
    );
    expect(created).not.toHaveProperty('version');
  });

  it('offers only active categories when creating', async () => {
    withSnippets([]);
    render(<SnippetsPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'New snippet' }),
    );

    const picker = within(screen.getByRole('dialog')).getByLabelText(
      'Category',
    );
    expect(
      within(picker).getByRole('option', { name: 'Java basics' }),
    ).toBeInTheDocument();
    expect(
      within(picker).queryByRole('option', { name: /Old topic/ }),
    ).not.toBeInTheDocument();
  });

  it('deletes an active snippet after confirming it cannot be undone', async () => {
    withSnippets([active]);
    let deleted = false;
    server.use(
      http.delete(`${SNIPPETS_URL}/${active.id}`, () => {
        deleted = true;
        return HttpResponse.text(null, { status: 204 });
      }),
    );
    render(<SnippetsPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Delete snippet' }),
    ).toHaveAccessibleDescription(/cannot be brought back/);

    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete',
      }),
    );

    await waitFor(() => expect(deleted).toBe(true));
    expect(await screen.findByRole('status')).toHaveTextContent(
      '"FizzBuzz" was deleted.',
    );
  });

  it('offers no actions on an already deleted snippet', async () => {
    withSnippets([{ ...active, lifecycle: 'DELETED' }]);
    render(<SnippetsPage />);

    await screen.findByText('FizzBuzz');
    // Deleted snippets stay visible to admins for copying, but are final.
    expect(
      screen.queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Restore' }),
    ).not.toBeInTheDocument();

    const card = screen.getByRole('listitem');
    expect(within(card).getByText('Deleted')).toBeInTheDocument();
    expect(within(card).getByText('int a = 1;')).toBeInTheDocument();
  });

  it('reports a delete rejected by the backend', async () => {
    withSnippets([active]);
    server.use(
      http.delete(`${SNIPPETS_URL}/${active.id}`, () =>
        HttpResponse.json(
          {
            code: 'ILLEGAL_LIFECYCLE_TRANSITION',
            message: 'Snippet is already deleted',
            status: 409,
          },
          { status: 409 },
        ),
      ),
    );
    render(<SnippetsPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete',
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /already deleted/,
    );
  });

  it('reports a load failure and retries', async () => {
    let calls = 0;
    server.use(
      http.get(CATEGORIES_URL, () => HttpResponse.json(pageOf([javaCategory]))),
      http.get(SNIPPETS_URL, () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.error()
          : HttpResponse.json(pageOf([active]));
      }),
    );
    render(<SnippetsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Cannot reach the server/,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('FizzBuzz')).toBeInTheDocument();
  });
});
