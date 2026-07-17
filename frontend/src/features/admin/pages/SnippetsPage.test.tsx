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
  revisionNumber: 1,
  snippetId: 'g1',
  source: 'int a = 1;',
  title: 'FizzBuzz',
  updatedAt: '2026-07-16T12:00:00Z',
  version: 3,
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
      enabled: true,
      id: 'u1',
      role: 'ADMIN',
      updatedAt: '2026-07-16T12:00:00Z',
      username: 'admin',
    },
  });
});

describe('SnippetsPage', () => {
  it('lists snippets with lifecycle, revision, and category', async () => {
    withSnippets([active]);
    render(<SnippetsPage />);

    expect(await screen.findByText('FizzBuzz')).toBeInTheDocument();
    const card = screen.getByRole('listitem');
    expect(within(card).getByText('Active')).toBeInTheDocument();
    expect(within(card).getByText('Rev 1')).toBeInTheDocument();
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

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'RETIRED');

    await waitFor(() => {
      expect(urls.at(-1)).toContain('lifecycle=RETIRED');
      expect(urls.at(-1)).toContain('page=0');
    });
  });

  it('warns before an edit that creates a new revision, then reports the result', async () => {
    withSnippets([active]);
    let body: Record<string, unknown> = {};
    server.use(
      http.put(`${SNIPPETS_URL}/${active.id}`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          data: {
            ...active,
            id: 's2',
            revisionNumber: 2,
            source: 'int b = 2;',
          },
        });
      }),
    );
    render(<SnippetsPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    await userEvent.clear(screen.getByLabelText('Code'));
    await userEvent.type(screen.getByLabelText('Code'), 'int b = 2;');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    const confirmation = await screen.findByRole('dialog', {
      name: /creates a new revision/i,
    });
    expect(confirmation).toHaveAccessibleDescription(/saved as revision 2/i);

    await userEvent.click(
      within(confirmation).getByRole('button', { name: 'Create revision 2' }),
    );

    await waitFor(() => expect(body.version).toBe(3));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Created revision 2. Revision 1 is now retired.',
    );
  });

  it('saves a title-only edit without warning about a revision', async () => {
    withSnippets([active]);
    server.use(
      http.put(`${SNIPPETS_URL}/${active.id}`, () =>
        HttpResponse.json({ data: { ...active, title: 'FizzBuzz v2' } }),
      ),
    );
    render(<SnippetsPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    await userEvent.clear(screen.getByLabelText('Title'));
    await userEvent.type(screen.getByLabelText('Title'), 'FizzBuzz v2');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Saved revision 1.',
    );
    expect(
      screen.queryByRole('dialog', { name: /creates a new revision/i }),
    ).not.toBeInTheDocument();
  });

  it('lets the user step back from the revision warning without saving', async () => {
    withSnippets([active]);
    let saved = false;
    server.use(
      http.put(`${SNIPPETS_URL}/${active.id}`, () => {
        saved = true;
        return HttpResponse.json({ data: active });
      }),
    );
    render(<SnippetsPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const form = within(screen.getByRole('dialog'));
    await userEvent.selectOptions(form.getByLabelText('Difficulty'), 'HARD');
    await userEvent.click(form.getByRole('button', { name: 'Save' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Back' }));

    expect(
      within(screen.getByRole('dialog')).getByLabelText('Title'),
    ).toHaveValue('FizzBuzz');
    expect(saved).toBe(false);
  });

  it('surfaces a stale version conflict without closing the form', async () => {
    withSnippets([active]);
    server.use(
      http.put(`${SNIPPETS_URL}/${active.id}`, () =>
        HttpResponse.json(
          {
            code: 'VERSION_CONFLICT',
            message:
              'Snippet revision was changed by someone else, reload it and try again',
            status: 409,
          },
          { status: 409 },
        ),
      ),
    );
    render(<SnippetsPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    await userEvent.clear(screen.getByLabelText('Code'));
    await userEvent.type(screen.getByLabelText('Code'), 'int c = 3;');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Create revision 2' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /changed by someone else/i,
    );
  });

  it('blocks a snippet without code or a category', async () => {
    withSnippets([]);
    let posted = false;
    server.use(
      http.post(SNIPPETS_URL, () => {
        posted = true;
        return HttpResponse.json({ data: active }, { status: 201 });
      }),
    );
    render(<SnippetsPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'New snippet' }),
    );
    await userEvent.type(screen.getByLabelText('Title'), 'FizzBuzz');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Code is required')).toBeInTheDocument();
    expect(screen.getByText('Category is required')).toBeInTheDocument();
    expect(posted).toBe(false);
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

  it('hides editing for a retired revision but still allows delete', async () => {
    withSnippets([{ ...active, id: 's9', lifecycle: 'RETIRED' }]);
    render(<SnippetsPage />);

    await screen.findByText('FizzBuzz');
    expect(
      screen.queryByRole('button', { name: 'Edit' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('offers only restore for a deleted revision', async () => {
    withSnippets([{ ...active, id: 's8', lifecycle: 'DELETED' }]);
    render(<SnippetsPage />);

    await screen.findByText('FizzBuzz');
    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument();
  });

  it('deactivates an active revision after confirmation', async () => {
    withSnippets([active]);
    let called = false;
    server.use(
      http.post(`${SNIPPETS_URL}/${active.id}/deactivate`, () => {
        called = true;
        return HttpResponse.json({
          data: { ...active, lifecycle: 'INACTIVE' },
        });
      }),
    );
    render(<SnippetsPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Deactivate' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Deactivate',
      }),
    );

    await waitFor(() => expect(called).toBe(true));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Revision 1 is now inactive.',
    );
  });

  it('activates an inactive revision', async () => {
    withSnippets([{ ...active, lifecycle: 'INACTIVE' }]);
    let called = false;
    server.use(
      http.post(`${SNIPPETS_URL}/${active.id}/activate`, () => {
        called = true;
        return HttpResponse.json({ data: active });
      }),
    );
    render(<SnippetsPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Activate' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Activate',
      }),
    );

    await waitFor(() => expect(called).toBe(true));
  });

  it('soft-deletes a revision and explains that results survive', async () => {
    withSnippets([active]);
    let called = false;
    server.use(
      http.delete(`${SNIPPETS_URL}/${active.id}`, () => {
        called = true;
        return HttpResponse.text(null, { status: 204 });
      }),
    );
    render(<SnippetsPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Delete revision' }),
    ).toHaveAccessibleDescription(/Past results keep pointing at it/);

    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete',
      }),
    );

    await waitFor(() => expect(called).toBe(true));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Revision 1 was deleted.',
    );
  });

  it('restores a deleted revision as inactive', async () => {
    withSnippets([{ ...active, lifecycle: 'DELETED' }]);
    let called = false;
    server.use(
      http.post(`${SNIPPETS_URL}/${active.id}/restore`, () => {
        called = true;
        return HttpResponse.json({
          data: { ...active, lifecycle: 'INACTIVE' },
        });
      }),
    );
    render(<SnippetsPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Restore' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Restore',
      }),
    );

    await waitFor(() => expect(called).toBe(true));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Revision 1 was restored as inactive.',
    );
  });

  it('reports a lifecycle action rejected by the backend', async () => {
    withSnippets([active]);
    server.use(
      http.post(`${SNIPPETS_URL}/${active.id}/deactivate`, () =>
        HttpResponse.json(
          {
            code: 'ILLEGAL_LIFECYCLE_TRANSITION',
            message: 'Cannot deactivate a revision that is RETIRED',
            status: 409,
          },
          { status: 409 },
        ),
      ),
    );
    render(<SnippetsPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Deactivate' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Deactivate',
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Cannot deactivate a revision that is RETIRED/,
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
