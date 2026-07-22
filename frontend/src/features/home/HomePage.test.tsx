import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AuthSession, CurrentUser } from '@/features/auth/session';
import HomePage from './HomePage';

function userResponse(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    createdAt: '2026-07-16T12:00:00Z',
    email: 'player@example.com',
    emailVerified: true,
    id: '019f66a0-981f-7368-aec1-4e814cc269f1',
    role: 'USER',
    updatedAt: '2026-07-16T12:00:00Z',
    username: 'player',
    ...overrides,
  };
}

function session(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 'jwt-token',
    expiresAt: Date.now() + 60_000,
    tokenType: 'Bearer',
    user: userResponse(),
    ...overrides,
  };
}

function renderHome(
  overrides: Partial<{
    onPlaySolo: () => void;
    session: AuthSession;
  }> = {},
) {
  return render(
    <HomePage
      onGoAdmin={vi.fn()}
      onGoHome={vi.fn()}
      onGoStatistics={vi.fn()}
      onLogout={vi.fn()}
      onPlaySolo={overrides.onPlaySolo ?? vi.fn()}
      session={overrides.session ?? session()}
      view="home"
    />,
  );
}

describe('HomePage', () => {
  it('shows both race mode cards for a regular user', () => {
    renderHome();

    expect(
      screen.getByRole('button', { name: /\.\/solo_race.*run/is }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /\.\/multiplayer.*coming soon/is }),
    ).toBeInTheDocument();
  });

  it('starts solo setup when the solo card is activated', async () => {
    const onPlaySolo = vi.fn();
    const user = userEvent.setup();
    renderHome({ onPlaySolo });

    await user.click(
      screen.getByRole('button', { name: /\.\/solo_race.*run/is }),
    );

    expect(onPlaySolo).toHaveBeenCalledTimes(1);
  });

  it('activates the solo card from the keyboard', async () => {
    const onPlaySolo = vi.fn();
    const user = userEvent.setup();
    renderHome({ onPlaySolo });

    // Nav order with the shared header: logo, statistics trophy, dashboard,
    // log out, then the solo card.
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    expect(
      screen.getByRole('button', { name: /\.\/solo_race.*run/is }),
    ).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(onPlaySolo).toHaveBeenCalledTimes(1);
  });

  it('has no separate Homepage link since this page is the homepage', () => {
    renderHome();

    expect(
      screen.queryByRole('button', { name: /^homepage$/i }),
    ).not.toBeInTheDocument();
  });

  it('goes to statistics when the trophy icon is clicked', async () => {
    const onGoStatistics = vi.fn();
    const user = userEvent.setup();
    render(
      <HomePage
        onGoAdmin={vi.fn()}
        onGoHome={vi.fn()}
        onGoStatistics={onGoStatistics}
        onLogout={vi.fn()}
        onPlaySolo={vi.fn()}
        session={session()}
        view="home"
      />,
    );

    await user.click(screen.getByRole('button', { name: /statistics/i }));

    expect(onGoStatistics).toHaveBeenCalledTimes(1);
  });

  it('goes to the homepage when the logo is clicked', async () => {
    const onGoHome = vi.fn();
    const user = userEvent.setup();
    render(
      <HomePage
        onGoAdmin={vi.fn()}
        onGoHome={onGoHome}
        onGoStatistics={vi.fn()}
        onLogout={vi.fn()}
        onPlaySolo={vi.fn()}
        session={session()}
        view="home"
      />,
    );

    await user.click(screen.getByRole('button', { name: /go to homepage/i }));

    expect(onGoHome).toHaveBeenCalledTimes(1);
  });

  it('disables the multiplayer card while it is coming soon', async () => {
    const onPlaySolo = vi.fn();
    const user = userEvent.setup();
    renderHome({ onPlaySolo });

    const multiplayer = screen.getByRole('button', {
      name: /\.\/multiplayer.*coming soon/is,
    });
    expect(multiplayer).toBeDisabled();

    await user.click(multiplayer);

    expect(onPlaySolo).not.toHaveBeenCalled();
  });
});
