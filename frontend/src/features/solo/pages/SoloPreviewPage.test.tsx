import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SoloPreviewPage from './SoloPreviewPage';
import { saveSession } from '@/features/auth/session';
import type { SoloSelection } from '@/features/solo/api/soloApi';
import { server } from '@/test/server';

const API_URL = 'http://localhost:8080';
const RANDOM_URL = `${API_URL}/api/snippets/random`;
const START_URL = `${API_URL}/api/solo-attempts`;
const WORLD_BEST_URL = `${API_URL}/api/solo-attempts/world-best`;

const selection: SoloSelection = {
  category: 'JAVA',
  categoryName: 'Java basics',
  difficulty: 'EASY',
};

const snippet = {
  category: 'JAVA',
  createdAt: '2026-07-16T12:00:00Z',
  difficulty: 'EASY',
  id: 's1',
  lifecycle: 'ACTIVE',
  source: 'int a = 1;',
  title: 'FizzBuzz',
  updatedAt: '2026-07-16T12:00:00Z',
};

function withCategories() {
  server.use(
    http.get(`${API_URL}/api/categories`, () =>
      HttpResponse.json({
        data: [
          { category: 'JAVA', displayName: 'Java' },
          { category: 'SQL', displayName: 'SQL' },
        ],
      }),
    ),
    http.get(WORLD_BEST_URL, () =>
      HttpResponse.json({
        data: {
          cpm: null,
          cpmHolderName: null,
          time: null,
          timeHolderName: null,
        },
      }),
    ),
    http.post(`${API_URL}/api/solo-attempts/:id/abandon`, ({ params }) =>
      HttpResponse.json({
        data: { attemptId: String(params.id), state: 'ABANDONED' },
      }),
    ),
  );
}

function baseProps() {
  return {
    onExitRace: vi.fn(),
    onSessionExpired: vi.fn(),
    selection,
  };
}

function renderPage(
  overrides: Partial<Parameters<typeof SoloPreviewPage>[0]> = {},
) {
  const props = {
    onExitRace: vi.fn(),
    onSessionExpired: vi.fn(),
    selection,
    ...overrides,
  };
  render(<SoloPreviewPage {...props} />);
  return props;
}

beforeEach(() => {
  withCategories();
  saveSession({
    accessToken: 'jwt-token',
    expiresAt: Date.now() + 60_000,
    tokenType: 'Bearer',
    user: {
      createdAt: '2026-07-16T12:00:00Z',
      email: 'player@example.com',
      emailVerified: true,
      id: 'u1',
      role: 'USER',
      updatedAt: '2026-07-16T12:00:00Z',
      username: 'player',
    },
  });
});

describe('SoloPreviewPage', () => {
  it('previews a snippet for the chosen selection', async () => {
    const urls: string[] = [];
    server.use(
      http.get(RANDOM_URL, ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json({ data: snippet });
      }),
    );
    renderPage();

    expect(
      await screen.findByRole('button', { name: /start race/i }),
    ).toBeInTheDocument();
    expect(urls[0]).toContain('category=JAVA');
    expect(urls[0]).toContain('difficulty=EASY');
  });

  it('offers a new snippet instead of a restart before the race begins', async () => {
    let fetches = 0;
    server.use(
      http.get(RANDOM_URL, () => {
        fetches += 1;
        return HttpResponse.json({ data: snippet });
      }),
    );
    renderPage();

    await screen.findByRole('button', { name: /start race/i });
    // Nothing has been raced yet, so there is nothing to restart.
    expect(screen.queryByRole('button', { name: /^restart$/i })).toBeNull();

    const fetchesBefore = fetches;
    await userEvent.click(screen.getByRole('button', { name: /new snippet/i }));

    expect(
      await screen.findByRole('button', { name: /start race/i }),
    ).toBeInTheDocument();
    expect(fetches).toBe(fetchesBefore + 1);
  });

  it('starts the race when Enter is pressed on the pre-start screen', async () => {
    let startCalls = 0;
    server.use(
      http.get(RANDOM_URL, () => HttpResponse.json({ data: snippet })),
      http.post(START_URL, () => {
        startCalls += 1;
        return HttpResponse.json(
          {
            data: {
              attemptId: 'a1',
              codeSnippetId: 's1',
              difficulty: 'EASY',
              startedAt: new Date(Date.now() + 3_000).toISOString(),
            },
          },
          { status: 201 },
        );
      }),
    );
    renderPage();

    await screen.findByRole('button', { name: /start race/i });
    await userEvent.keyboard('{Enter}');

    await waitFor(() => expect(startCalls).toBe(1));
    expect(screen.queryByRole('button', { name: /start race/i })).toBeNull();
  });

  it('shows an empty state when no snippet matches', async () => {
    server.use(
      http.get(RANDOM_URL, () =>
        HttpResponse.json(
          {
            code: 'NO_ELIGIBLE_SNIPPET',
            message: 'No eligible snippet is available',
            status: 404,
          },
          { status: 404 },
        ),
      ),
    );
    renderPage();

    expect(await screen.findByText(/No snippets match/)).toBeInTheDocument();
    // With nothing to race there is no race screen at all.
    expect(
      screen.queryByRole('button', { name: /start race/i }),
    ).not.toBeInTheDocument();
  });

  it('starts exactly one attempt and counts down to the server time', async () => {
    let startCalls = 0;
    server.use(
      http.get(RANDOM_URL, () => HttpResponse.json({ data: snippet })),
      http.post(START_URL, async ({ request }) => {
        startCalls += 1;
        await expect(request.json()).resolves.toEqual({ codeSnippetId: 's1' });
        return HttpResponse.json(
          {
            data: {
              attemptId: 'a1',
              codeSnippetId: 's1',
              difficulty: 'EASY',
              startedAt: new Date(Date.now() + 3_000).toISOString(),
            },
          },
          { status: 201 },
        );
      }),
    );
    renderPage();

    const startButton = await screen.findByRole('button', {
      name: /start race/i,
    });
    await userEvent.click(startButton);
    await userEvent.click(startButton);

    // Only the first click may create an attempt.
    await waitFor(() => expect(startCalls).toBe(1));
    // The overlay shows the server's remaining seconds, not a local 3-2-1.
    expect(await screen.findByText('3')).toBeInTheDocument();
  });

  it('abandons a running attempt when the page unmounts', async () => {
    let abandoned = false;
    server.use(
      http.get(RANDOM_URL, () => HttpResponse.json({ data: snippet })),
      http.post(START_URL, () =>
        HttpResponse.json(
          {
            data: {
              attemptId: 'a1',
              codeSnippetId: 's1',
              difficulty: 'EASY',
              startedAt: new Date(Date.now() + 3_000).toISOString(),
            },
          },
          { status: 201 },
        ),
      ),
      http.post(`${API_URL}/api/solo-attempts/a1/abandon`, () => {
        abandoned = true;
        return HttpResponse.json({
          data: { attemptId: 'a1', state: 'ABANDONED' },
        });
      }),
    );
    const { unmount } = render(<SoloPreviewPage {...baseProps()} />);

    await userEvent.click(
      await screen.findByRole('button', { name: /start race/i }),
    );
    await screen.findByText('3');

    unmount();

    await waitFor(() => expect(abandoned).toBe(true));
  });

  it('does not abandon on unmount when no attempt was started', async () => {
    let abandonCalls = 0;
    server.use(
      http.get(RANDOM_URL, () => HttpResponse.json({ data: snippet })),
      http.post(`${API_URL}/api/solo-attempts/:id/abandon`, () => {
        abandonCalls += 1;
        return HttpResponse.json({
          data: { attemptId: 'x', state: 'ABANDONED' },
        });
      }),
    );
    const { unmount } = render(<SoloPreviewPage {...baseProps()} />);

    await screen.findByRole('button', { name: /start race/i });
    unmount();

    expect(abandonCalls).toBe(0);
  });

  it('hands off to the race once the server start time passes', async () => {
    server.use(
      http.get(RANDOM_URL, () => HttpResponse.json({ data: snippet })),
      http.post(START_URL, () =>
        HttpResponse.json(
          {
            data: {
              attemptId: 'a1',
              codeSnippetId: 's1',
              difficulty: 'EASY',
              // Already elapsed, so the hand-off happens on the first tick.
              startedAt: new Date(Date.now() - 1).toISOString(),
            },
          },
          { status: 201 },
        ),
      ),
    );
    const { container } = render(<SoloPreviewPage {...baseProps()} />);

    await userEvent.click(
      await screen.findByRole('button', { name: /start race/i }),
    );

    // Typing unlocks only once the server's startedAt has passed.
    await waitFor(() =>
      expect(container.querySelector('textarea')).not.toHaveAttribute(
        'readonly',
      ),
    );
  });

  it('surfaces a start failure and keeps the user on the preview', async () => {
    server.use(
      http.get(RANDOM_URL, () => HttpResponse.json({ data: snippet })),
      http.post(START_URL, () =>
        HttpResponse.json(
          {
            code: 'ONE_ACTIVE_ATTEMPT_ALLOWED',
            message: 'Already has an active attempt',
            status: 409,
          },
          { status: 409 },
        ),
      ),
    );
    const { container } = render(<SoloPreviewPage {...baseProps()} />);

    await userEvent.click(
      await screen.findByRole('button', { name: /start race/i }),
    );

    expect(
      await screen.findByText(/already have an attempt in progress/i),
    ).toBeInTheDocument();
    // A failed start must leave the typing surface locked.
    expect(container.querySelector('textarea')).toHaveAttribute('readonly');
    // ...and must not enter race mode, which would hide the only way to retry.
    expect(
      screen.getByRole('button', { name: /start race/i }),
    ).toBeInTheDocument();
  });

  it('reports an expired session instead of an error message', async () => {
    server.use(
      http.get(RANDOM_URL, () =>
        HttpResponse.json(
          {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required',
            status: 401,
          },
          { status: 401 },
        ),
      ),
    );
    const props = renderPage();

    await waitFor(() => expect(props.onSessionExpired).toHaveBeenCalled());
  });
});
