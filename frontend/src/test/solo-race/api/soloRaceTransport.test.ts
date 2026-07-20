import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSoloRaceTransport } from '../../../features/solo-race/api/soloRaceTransport';
import { soloRaceApi } from '../../../features/solo-race/api/soloRaceApi';

vi.mock('../../../features/solo-race/api/soloRaceApi', () => ({
  soloRaceApi: {
    submitProgress: vi.fn(),
  },
}));

describe('createSoloRaceTransport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses a backend request sequence per submitted batch', async () => {
    vi.mocked(soloRaceApi.submitProgress)
      .mockResolvedValueOnce({
        acceptedOffset: 2,
        attemptId: 'attempt-1',
        state: 'ACTIVE',
      })
      .mockResolvedValueOnce({
        acceptedOffset: 3,
        attemptId: 'attempt-1',
        state: 'ACTIVE',
      });

    const transport = createSoloRaceTransport('attempt-1');

    await expect(
      transport.sendProgressBatch({
        events: [
          { value: 'a', version: 1 },
          { value: 'b', version: 2 },
        ],
      }),
    ).resolves.toEqual({ version: 2, serverOffset: 2, completed: false });

    await transport.sendProgressBatch({
      events: [{ value: 'c', version: 3 }],
    });

    expect(soloRaceApi.submitProgress).toHaveBeenNthCalledWith(
      1,
      'attempt-1',
      1,
      'ab',
    );
    expect(soloRaceApi.submitProgress).toHaveBeenNthCalledWith(
      2,
      'attempt-1',
      2,
      'c',
    );
  });

  it('maps backend completion responses into a terminal acknowledgement', async () => {
    vi.mocked(soloRaceApi.submitProgress).mockResolvedValueOnce({
      attemptId: 'attempt-1',
      cpm: 240,
      difficulty: 'EASY',
      durationMs: 5000,
      finishedAt: '2026-07-20T10:00:00.000Z',
      state: 'COMPLETED',
    });

    const transport = createSoloRaceTransport('attempt-1');

    await expect(
      transport.sendProgressBatch({
        events: [{ value: 'a', version: 1 }],
      }),
    ).resolves.toEqual({
      completed: true,
      result: {
        cpm: 240,
        durationMs: 5000,
        finishedAt: '2026-07-20T10:00:00.000Z',
        state: 'COMPLETED',
      },
      serverOffset: 1,
      version: 1,
    });
  });
});
