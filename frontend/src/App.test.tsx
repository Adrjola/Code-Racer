import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { useSoloRaceSession } from './features/solo-race/hooks/useSoloRaceSession';

vi.mock('./features/solo-race/hooks/useSoloRaceSession', () => ({
  useSoloRaceSession: vi.fn(() => ({
    isLoading: true,
    error: null,
    session: null,
    preview: {
      snippet: {
        id: 'snippet-1',
        code: 'const x = 1;',
        type: 'easy',
      },
    },
    startNewRace: vi.fn(),
    resetToMenuState: vi.fn(),
  })),
}));

const mockedUseSoloRaceSession = vi.mocked(useSoloRaceSession);

describe('App', () => {
  it('renders the product name as the page heading', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /code racer/i }),
    ).toBeInTheDocument();
  });

  it('renders the solo race route screen for /play/solo', () => {
    render(
      <MemoryRouter initialEntries={['/play/solo']}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /coderacer/i }),
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /restart/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /lobby/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/typing progress/i)).toBeInTheDocument();
  });

  it('renders the lobby route with multiplayer and singleplayer actions', () => {
    render(
      <MemoryRouter initialEntries={['/lobby']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /lobby/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /multiplayer/i })).toHaveAttribute('href', '/play/public');
    expect(screen.getByRole('link', { name: /singleplayer/i })).toHaveAttribute('href', '/play/solo');
  });

  it('keeps solo layout and shows inline error when snippet cannot be loaded', () => {
    mockedUseSoloRaceSession.mockReturnValueOnce({
      isLoading: false,
      error: 'failed_to_load_preview_snippet',
      session: null,
      preview: null,
      startNewRace: vi.fn(),
      resetToMenuState: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/play/solo']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /coderacer/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/typing progress/i)).toBeInTheDocument();
    expect(screen.getByText('failed_to_load_preview_snippet')).toBeInTheDocument();
  });
});
