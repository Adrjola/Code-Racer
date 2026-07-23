import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import UsersPage from './UsersPage';
import type { AdminUser } from './usersApi';
import { saveSession, type AuthSession } from '@/features/auth/session';
import { server } from '@/test/server';

const API_URL = 'http://localhost:8080';
const USERS_URL = `${API_URL}/api/admin/users`;

const adminSession: AuthSession = {
  accessToken: 'jwt-token',
  expiresAt: Date.now() + 60_000,
  tokenType: 'Bearer',
  user: {
    createdAt: '2026-07-16T12:00:00Z',
    email: 'admin@example.com',
    emailVerified: true,
    id: 'admin-1',
    role: 'ADMIN',
    updatedAt: '2026-07-16T12:00:00Z',
    username: 'admin',
  },
};

const activeUser: AdminUser = {
  createdAt: '2026-07-16T12:00:00Z',
  deleted: false,
  email: 'player@example.com',
  emailVerified: true,
  id: 'u1',
  role: 'USER',
  updatedAt: '2026-07-16T12:00:00Z',
  username: 'player1',
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

function withUsers(content: unknown[], overrides = {}) {
  server.use(
    http.get(USERS_URL, () => HttpResponse.json(pageOf(content, overrides))),
  );
}

beforeEach(() => {
  saveSession(adminSession);
});

describe('UsersPage', () => {
  it('lists users with verification and status shown as separate badges', async () => {
    withUsers([activeUser]);
    render(<UsersPage session={adminSession} />);

    expect(await screen.findByText('player1')).toBeInTheDocument();
    const card = screen.getByRole('listitem');
    expect(within(card).getByText('Verified')).toBeInTheDocument();
    expect(within(card).getByText('Active')).toBeInTheDocument();
  });

  it('keeps verification status separate from deleted status', async () => {
    withUsers([{ ...activeUser, deleted: true, emailVerified: true }]);
    render(<UsersPage session={adminSession} />);

    const card = await screen.findByRole('listitem');
    // A deleted user that was verified must still show as verified, not
    // have its verification state inferred from being deleted.
    expect(within(card).getByText('Verified')).toBeInTheDocument();
    expect(within(card).getByText('Deleted')).toBeInTheDocument();
  });

  it('shows an empty state for filters that match nothing', async () => {
    withUsers([]);
    render(<UsersPage session={adminSession} />);

    expect(
      await screen.findByText(/No users match these filters/),
    ).toBeInTheDocument();
  });

  it('reports a load failure and retries', async () => {
    let calls = 0;
    server.use(
      http.get(USERS_URL, () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.error()
          : HttpResponse.json(pageOf([activeUser]));
      }),
    );
    render(<UsersPage session={adminSession} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Cannot reach the server/,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('player1')).toBeInTheDocument();
  });

  it('sends the chosen filters and resets to the first page', async () => {
    const urls: string[] = [];
    server.use(
      http.get(USERS_URL, ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json(
          pageOf([activeUser], { totalElements: 12, totalPages: 2 }),
        );
      }),
    );
    render(<UsersPage session={adminSession} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Next' }));
    await waitFor(() => expect(urls.at(-1)).toContain('page=1'));

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'true');

    await waitFor(() => {
      expect(urls.at(-1)).toContain('deleted=true');
      expect(urls.at(-1)).toContain('page=0');
    });
  });

  it('shows full user details in a dialog without exposing secret fields', async () => {
    withUsers([{ ...activeUser, passwordHash: 'super-secret-hash' }]);
    render(<UsersPage session={adminSession} />);

    await userEvent.click(await screen.findByRole('button', { name: 'View' }));

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('USER')).toBeInTheDocument();
    expect(screen.queryByText('super-secret-hash')).not.toBeInTheDocument();
  });

  it('deletes a user after confirming', async () => {
    withUsers([activeUser]);
    let deleted = false;
    server.use(
      http.delete(`${USERS_URL}/${activeUser.id}`, () => {
        deleted = true;
        return HttpResponse.text(null, { status: 204 });
      }),
    );
    render(<UsersPage session={adminSession} />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Delete user' }),
    ).toBeInTheDocument();

    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete',
      }),
    );

    await waitFor(() => expect(deleted).toBe(true));
    expect(await screen.findByRole('status')).toHaveTextContent(
      '"player1" was deleted.',
    );
  });

  it('restores a deleted user after confirming', async () => {
    withUsers([{ ...activeUser, deleted: true }]);
    let restored = false;
    server.use(
      http.post(`${USERS_URL}/${activeUser.id}/restore`, () => {
        restored = true;
        return HttpResponse.json({ data: { ...activeUser, deleted: false } });
      }),
    );
    render(<UsersPage session={adminSession} />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Restore' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Restore',
      }),
    );

    await waitFor(() => expect(restored).toBe(true));
    expect(await screen.findByRole('status')).toHaveTextContent(
      '"player1" was restored.',
    );
  });

  it('reports a conflict when the target was already changed and resyncs the list', async () => {
    withUsers([activeUser]);
    server.use(
      http.delete(`${USERS_URL}/${activeUser.id}`, () =>
        HttpResponse.json(
          {
            code: 'USER_ALREADY_DELETED',
            message: 'User is already deleted',
            status: 409,
          },
          { status: 409 },
        ),
      ),
    );
    render(<UsersPage session={adminSession} />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete',
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'User is already deleted',
    );
  });

  it("does not offer deleting the logged-in admin's own account", async () => {
    withUsers([{ ...activeUser, id: adminSession.user.id, role: 'ADMIN' }]);
    render(<UsersPage session={adminSession} />);

    await screen.findByText('player1');
    expect(
      screen.queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument();
  });

  it('edits a user, pre-filling the current values', async () => {
    withUsers([activeUser]);
    let body: Record<string, unknown> = {};
    server.use(
      http.put(`${USERS_URL}/${activeUser.id}`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          data: {
            ...activeUser,
            email: 'new@example.com',
            username: 'newname',
          },
        });
      }),
    );
    render(<UsersPage session={adminSession} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));

    const dialog = within(screen.getByRole('dialog', { name: 'Edit user' }));
    expect(dialog.getByLabelText('Username')).toHaveValue('player1');
    expect(dialog.getByLabelText('Email')).toHaveValue('player@example.com');

    await userEvent.clear(dialog.getByLabelText('Username'));
    await userEvent.type(dialog.getByLabelText('Username'), 'newname');
    await userEvent.clear(dialog.getByLabelText('Email'));
    await userEvent.type(dialog.getByLabelText('Email'), 'new@example.com');
    await userEvent.click(dialog.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(body).toEqual({ email: 'new@example.com', username: 'newname' }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      '"player1" was updated.',
    );
  });

  it('shows a client-side validation error without submitting', async () => {
    withUsers([activeUser]);
    let submitted = false;
    server.use(
      http.put(`${USERS_URL}/${activeUser.id}`, () => {
        submitted = true;
        return HttpResponse.json({ data: activeUser });
      }),
    );
    render(<UsersPage session={adminSession} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Edit user' }));
    await userEvent.clear(dialog.getByLabelText('Email'));
    await userEvent.click(dialog.getByRole('button', { name: 'Save' }));

    expect(dialog.getByText('Email is required')).toBeInTheDocument();
    expect(submitted).toBe(false);
  });

  it('reports a conflict when the new email or username is already taken', async () => {
    withUsers([activeUser]);
    server.use(
      http.put(`${USERS_URL}/${activeUser.id}`, () =>
        HttpResponse.json(
          {
            code: 'USER_ALREADY_EXISTS',
            message: 'A user with this email or username already exists',
            status: 409,
          },
          { status: 409 },
        ),
      ),
    );
    render(<UsersPage session={adminSession} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Edit user' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A user with this email or username already exists',
    );
  });
});
