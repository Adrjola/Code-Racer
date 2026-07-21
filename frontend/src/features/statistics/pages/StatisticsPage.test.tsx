import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AuthSession, CurrentUser } from '@/features/auth/session';
import StatisticsPage from './StatisticsPage';

function userResponse(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    createdAt: '2026-07-16T12:00:00Z',
    email: 'player@example.com',
    emailVerified: true,
    id: '019f66a0-981f-7368-aec1-4e814cc269f1',
    role: 'USER',
    updatedAt: '2026-07-16T12:00:00Z',
    username: 'PowerPuffGirl',
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

function renderStatistics(overrides: Partial<{ session: AuthSession }> = {}) {
  return render(
    <StatisticsPage
      onGoDashboard={vi.fn()}
      onLogout={vi.fn()}
      session={overrides.session ?? session()}
    />,
  );
}

describe('StatisticsPage', () => {
  it('shows the global easy ranking by default', () => {
    renderStatistics();

    expect(
      screen.getByRole('heading', { name: /race statistics/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /global/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: /baby mode/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText('zoomer')).toBeInTheDocument();
    expect(screen.getByText('0:17')).toBeInTheDocument();
  });

  it('marks the current user row', () => {
    renderStatistics();

    const rows = screen.getAllByRole('listitem');
    const ownRow = rows.find((row) => row.textContent?.includes('YOU'));

    expect(ownRow).toBeDefined();
    expect(ownRow?.textContent).toContain('PowerPuffGirl');
  });

  it('shows a placeholder when a difficulty has no ranking data yet', async () => {
    const user = userEvent.setup();
    renderStatistics();

    await user.click(screen.getByRole('tab', { name: /tryhard/i }));

    expect(screen.getByRole('tab', { name: /tryhard/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.queryByText('zoomer')).not.toBeInTheDocument();
    expect(
      screen.getByText(/no global rankings yet for this difficulty/i),
    ).toBeInTheDocument();
  });

  it('shows the personal easy activity by default when switching tabs', async () => {
    const user = userEvent.setup();
    renderStatistics();

    await user.click(screen.getByRole('tab', { name: /personal/i }));

    expect(screen.getByRole('tab', { name: /personal/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getAllByText('Two Sum').length).toBeGreaterThan(0);
    expect(screen.getByText('Group By Count')).toBeInTheDocument();
  });

  it('shows a placeholder when a difficulty has no personal activity yet', async () => {
    const user = userEvent.setup();
    renderStatistics();

    await user.click(screen.getByRole('tab', { name: /personal/i }));
    await user.click(screen.getByRole('tab', { name: /locked in/i }));

    expect(
      screen.getByText(/no activity yet for this difficulty/i),
    ).toBeInTheDocument();
  });

  it('goes to the dashboard when the logo is clicked', async () => {
    const onGoDashboard = vi.fn();
    const user = userEvent.setup();
    render(
      <StatisticsPage
        onGoDashboard={onGoDashboard}
        onLogout={vi.fn()}
        session={session()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /go to dashboard/i }));

    expect(onGoDashboard).toHaveBeenCalledTimes(1);
  });

  it('no longer has a Dashboard item in the menu', async () => {
    const user = userEvent.setup();
    renderStatistics();

    await user.click(screen.getByRole('button', { name: /menu/i }));

    expect(
      screen.queryByRole('button', { name: /^dashboard$/i }),
    ).not.toBeInTheDocument();
  });

  it('logs out from the menu', async () => {
    const onLogout = vi.fn();
    const user = userEvent.setup();
    render(
      <StatisticsPage
        onGoDashboard={vi.fn()}
        onLogout={onLogout}
        session={session()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /menu/i }));
    await user.click(screen.getByRole('button', { name: /log out/i }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
