import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveSession, type AuthSession } from '@/features/auth/session';
import type { Category } from '@/features/solo/api/soloApi';
import { server } from '@/test/server';
import SoloSetupPage from './SoloSetupPage';

const API_URL = 'http://localhost:8080';

function session(): AuthSession {
  return {
    accessToken: 'jwt-token',
    expiresAt: Date.now() + 60_000,
    tokenType: 'Bearer',
    user: {
      createdAt: '2026-07-16T12:00:00Z',
      email: 'player@example.com',
      emailVerified: true,
      id: '019f66a0-981f-7368-aec1-4e814cc269f1',
      role: 'USER',
      updatedAt: '2026-07-16T12:00:00Z',
      username: 'player',
    },
  };
}

function category(id: string, name: string): Category {
  return {
    active: true,
    createdAt: '2026-07-01T00:00:00Z',
    description: `${name} snippets`,
    id,
    name,
    updatedAt: '2026-07-01T00:00:00Z',
  };
}

function mockCategories(categories: Category[]) {
  server.use(
    http.get(`${API_URL}/api/categories`, () =>
      HttpResponse.json({
        data: {
          content: categories,
          page: {
            number: 0,
            size: 100,
            totalElements: categories.length,
            totalPages: 1,
          },
        },
      }),
    ),
  );
}

function renderPage(
  overrides: Partial<Parameters<typeof SoloSetupPage>[0]> = {},
) {
  const props = {
    onGoDashboard: vi.fn(),
    onLogout: vi.fn(),
    onSelect: vi.fn(),
    onSessionExpired: vi.fn(),
    session: session(),
    ...overrides,
  };
  render(<SoloSetupPage {...props} />);
  return props;
}

beforeEach(() => {
  saveSession(session());
});

describe('SoloSetupPage', () => {
  it('shows a loading state and then the fetched categories', async () => {
    mockCategories([category('cat-1', 'JAVA'), category('cat-2', 'SQL')]);
    renderPage();

    expect(screen.getByText(/loading categories/i)).toBeInTheDocument();

    const list = await screen.findByRole('list', { name: /categories/i });
    expect(
      within(list).getByRole('button', { name: /java/i }),
    ).toBeInTheDocument();
    expect(
      within(list).getByRole('button', { name: /sql/i }),
    ).toBeInTheDocument();
  });

  it('keeps difficulty disabled until a category is selected', async () => {
    mockCategories([category('cat-1', 'JAVA')]);
    renderPage();

    await screen.findByRole('button', { name: /java/i });

    expect(screen.getByRole('button', { name: /baby mode/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /tryhard/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /locked in/i })).toBeDisabled();
  });

  it('marks the chosen category as pressed and enables difficulty', async () => {
    mockCategories([category('cat-1', 'JAVA')]);
    const user = userEvent.setup();
    renderPage();

    const java = await screen.findByRole('button', { name: /java/i });
    await user.click(java);

    expect(java).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /baby mode/i })).toBeEnabled();
  });

  it('does not advance until Play is clicked, then calls onSelect with the choice', async () => {
    mockCategories([category('cat-1', 'JAVA'), category('cat-2', 'SQL')]);
    const user = userEvent.setup();
    const { onSelect } = renderPage();

    await user.click(await screen.findByRole('button', { name: /sql/i }));
    await user.click(screen.getByRole('button', { name: /locked in/i }));

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /play/i })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /play/i }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith({
      categoryId: 'cat-2',
      categoryName: 'SQL',
      difficulty: 'HARD',
    });
  });

  it('keeps Play disabled when only a difficulty is picked without a category', async () => {
    mockCategories([category('cat-1', 'JAVA')]);
    renderPage();

    await screen.findByRole('button', { name: /java/i });
    // Difficulty is disabled, so a click has no effect.
    expect(screen.getByRole('button', { name: /baby mode/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /play/i })).toBeDisabled();
  });

  it('supports selecting a category and difficulty with the keyboard', async () => {
    mockCategories([category('cat-1', 'JAVA')]);
    const user = userEvent.setup();
    const { onSelect } = renderPage();

    const java = await screen.findByRole('button', { name: /java/i });
    java.focus();
    await user.keyboard('{Enter}');
    expect(java).toHaveAttribute('aria-pressed', 'true');

    screen.getByRole('button', { name: /tryhard/i }).focus();
    await user.keyboard('{Enter}');

    screen.getByRole('button', { name: /play/i }).focus();
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledWith({
      categoryId: 'cat-1',
      categoryName: 'JAVA',
      difficulty: 'MEDIUM',
    });
  });

  it('shows an empty state when there are no categories', async () => {
    mockCategories([]);
    renderPage();

    expect(
      await screen.findByText(/no categories are available/i),
    ).toBeInTheDocument();
  });

  it('shows an error with a retry that refetches categories', async () => {
    let attempts = 0;
    server.use(
      http.get(`${API_URL}/api/categories`, () => {
        attempts += 1;
        if (attempts === 1) {
          return HttpResponse.error();
        }
        return HttpResponse.json({
          data: {
            content: [category('cat-1', 'JAVA')],
            page: { number: 0, size: 100, totalElements: 1, totalPages: 1 },
          },
        });
      }),
    );
    const user = userEvent.setup();
    renderPage();

    const retry = await screen.findByRole('button', { name: /try again/i });
    await user.click(retry);

    expect(
      await screen.findByRole('button', { name: /java/i }),
    ).toBeInTheDocument();
  });

  it('calls onSessionExpired when the session has expired', async () => {
    server.use(
      http.get(`${API_URL}/api/categories`, () =>
        HttpResponse.json(
          {
            code: 'AUTHENTICATION_REQUIRED',
            instance: '/api/categories',
            message: 'expired',
            status: 401,
          },
          { status: 401 },
        ),
      ),
    );
    const { onSessionExpired } = renderPage();

    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1));
  });

  it('shows the username and navigates to the dashboard from the logo', async () => {
    mockCategories([category('cat-1', 'JAVA')]);
    const user = userEvent.setup();
    const { onGoDashboard } = renderPage();

    expect(await screen.findByText('player')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /go to dashboard/i }));

    expect(onGoDashboard).toHaveBeenCalledTimes(1);
  });

  it('logs out from the menu', async () => {
    mockCategories([category('cat-1', 'JAVA')]);
    const user = userEvent.setup();
    const { onLogout } = renderPage();

    await user.click(screen.getByRole('button', { name: /menu/i }));
    await user.click(screen.getByRole('button', { name: /log out/i }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
