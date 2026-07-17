import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSoloRaceSession } from '../../../features/solo-race/hooks/useSoloRaceSession';
import { soloRaceApi } from '../../../features/solo-race/api/soloRaceApi';

vi.mock('../../../features/solo-race/api/soloRaceApi', () => ({
  soloRaceApi: {
    getRandomSnippet: vi.fn(),
    startAttempt: vi.fn(),
  },
}));

describe('useSoloRaceSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads only preview snippet on mount and does not auto-start attempt', async () => {
    (soloRaceApi.getRandomSnippet as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'snippet-preview',
      source: 'const preview = true;',
      difficulty: 'easy',
    });

    const { result } = renderHook(() => useSoloRaceSession());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.preview?.snippet.id).toBe('snippet-preview');
    expect(result.current.session).toBeNull();
    expect(soloRaceApi.startAttempt).not.toHaveBeenCalled();
  });

  it('starts a new race by fetching random snippet and starting attempt', async () => {
    (soloRaceApi.getRandomSnippet as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: 'preview', source: 'preview', difficulty: 'easy' })
      .mockResolvedValueOnce({ id: 'snippet-race', source: 'const race = 1;', difficulty: 'medium' });
    (soloRaceApi.startAttempt as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      attemptId: 'attempt-1',
      codeSnippetId: 'snippet-race',
      difficulty: 'medium',
      startedAt: '2026-07-17T00:00:00.000Z',
    });

    const { result } = renderHook(() => useSoloRaceSession());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.startNewRace();
    });

    expect(soloRaceApi.startAttempt).toHaveBeenCalledWith('snippet-race');
    expect(result.current.session?.snippet.id).toBe('snippet-race');
    expect(result.current.session?.startedAt).toBe('2026-07-17T00:00:00.000Z');
  });

  it('resets to menu state without starting an attempt', async () => {
    (soloRaceApi.getRandomSnippet as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: 'preview', source: 'preview', difficulty: 'easy' })
      .mockResolvedValueOnce({ id: 'snippet-race', source: 'const race = 1;', difficulty: 'medium' })
      .mockResolvedValueOnce({ id: 'preview-2', source: 'const menu = 1;', difficulty: 'easy' });
    (soloRaceApi.startAttempt as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      attemptId: 'attempt-1',
      codeSnippetId: 'snippet-race',
      difficulty: 'medium',
      startedAt: '2026-07-17T00:00:00.000Z',
    });

    const { result } = renderHook(() => useSoloRaceSession());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.startNewRace();
    });

    await act(async () => {
      await result.current.resetToMenuState();
    });

    expect(result.current.session).toBeNull();
    expect(result.current.preview?.snippet.id).toBe('preview-2');
    expect(soloRaceApi.startAttempt).toHaveBeenCalledTimes(1);
  });
});