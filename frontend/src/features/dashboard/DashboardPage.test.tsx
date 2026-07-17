import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AuthSession, CurrentUser } from '@/features/auth/auth';
import DashboardPage from './DashboardPage';

function userResponse(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    createdAt: '2026-07-16T12:00:00Z',
    email: 'player@example.com',
    emailVerified: true,
    enabled: true,
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

function renderDashboard(
  overrides: Partial<{
    onPlaySolo: () => void;
    session: AuthSession;
  }> = {},
) {
  return render(
    <DashboardPage
      onGoAdmin={vi.fn()}
      onGoDashboard={vi.fn()}
      onGoLobby={vi.fn()}
      onLogout={vi.fn()}
      onPlaySolo={overrides.onPlaySolo ?? vi.fn()}
      session={overrides.session ?? session()}
      view="dashboard"
    />,
  );
}

describe('DashboardPage', () => {
  it('shows both race mode cards for a regular user', () => {
    renderDashboard();

    expect(
      screen.getByRole('button', { name: /\.\/solo_race.*run/is }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /\.\/multiplayer.*run/is }),
    ).toBeInTheDocument();
  });

  it('starts solo setup when the solo card is activated', async () => {
    const onPlaySolo = vi.fn();
    const user = userEvent.setup();
    renderDashboard({ onPlaySolo });

    await user.click(
      screen.getByRole('button', { name: /\.\/solo_race.*run/is }),
    );

    expect(onPlaySolo).toHaveBeenCalledTimes(1);
  });

  it('activates the solo card from the keyboard', async () => {
    const onPlaySolo = vi.fn();
    const user = userEvent.setup();
    renderDashboard({ onPlaySolo });

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

  it('does not affect solo when the multiplayer card is clicked', async () => {
    const onPlaySolo = vi.fn();
    const user = userEvent.setup();
    renderDashboard({ onPlaySolo });

    await user.click(
      screen.getByRole('button', { name: /\.\/multiplayer.*run/is }),
    );

    expect(onPlaySolo).not.toHaveBeenCalled();
  });
});
