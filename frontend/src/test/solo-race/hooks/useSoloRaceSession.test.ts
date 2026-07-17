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
    (
      soloRaceApi.getRandomSnippet as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
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
      .mockResolvedValueOnce({
        id: 'preview',
        source: 'preview',
        difficulty: 'easy',
      })
      .mockResolvedValueOnce({
        id: 'snippet-race',
        source: 'const race = 1;',
        difficulty: 'medium',
      });
    (
      soloRaceApi.startAttempt as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
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

  it('retries snippet fetch on restart when random API returns the same snippet id', async () => {
    (soloRaceApi.getRandomSnippet as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        id: 'preview-1',
        source: 'const preview = 1;',
        difficulty: 'easy',
      })
      .mockResolvedValueOnce({
        id: 'preview-1',
        source: 'const preview = 1;',
        difficulty: 'easy',
      })
      .mockResolvedValueOnce({
        id: 'snippet-race-2',
        source: 'const race = 2;',
        difficulty: 'medium',
      });
    (
      soloRaceApi.startAttempt as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      attemptId: 'attempt-2',
      codeSnippetId: 'snippet-race-2',
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

    expect(soloRaceApi.getRandomSnippet).toHaveBeenCalledTimes(3);
    expect(soloRaceApi.startAttempt).toHaveBeenCalledWith('snippet-race-2');
    expect(result.current.session?.snippet.id).toBe('snippet-race-2');
  });

  it('clears prior snippet-load error when a race starts successfully', async () => {
    (soloRaceApi.getRandomSnippet as unknown as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('request_failed'))
      .mockResolvedValueOnce({
        id: 'snippet-race',
        source: 'const race = 1;',
        difficulty: 'medium',
      });
    (
      soloRaceApi.startAttempt as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      attemptId: 'attempt-1',
      codeSnippetId: 'snippet-race',
      difficulty: 'medium',
      startedAt: '2026-07-17T00:00:00.000Z',
    });

    const { result } = renderHook(() => useSoloRaceSession());

    await waitFor(() => {
      expect(result.current.error).toBe('failed_to_start_solo_race');
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.startNewRace();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.session?.snippet.id).toBe('snippet-race');
  });

  it('resets to menu state without starting an attempt', async () => {
    (soloRaceApi.getRandomSnippet as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        id: 'preview',
        source: 'preview',
        difficulty: 'easy',
      })
      .mockResolvedValueOnce({
        id: 'snippet-race',
        source: 'const race = 1;',
        difficulty: 'medium',
      })
      .mockResolvedValueOnce({
        id: 'preview-2',
        source: 'const menu = 1;',
        difficulty: 'easy',
      });
    (
      soloRaceApi.startAttempt as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
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
