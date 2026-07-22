import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SoloRaceWorldBest } from '../../../../features/solo/race/components/SoloRaceWorldBest';
import { soloRaceApi } from '../../../../features/solo/race/api/soloRaceApi';

vi.mock('../../../../features/solo/race/api/soloRaceApi', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../features/solo/race/api/soloRaceApi')
  >('../../../../features/solo/race/api/soloRaceApi');
  return {
    ...actual,
    soloRaceApi: {
      ...actual.soloRaceApi,
      getWorldBest: vi.fn(),
    },
  };
});

describe('SoloRaceWorldBest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders N/A values when world best data is not available', async () => {
    vi.mocked(soloRaceApi.getWorldBest).mockRejectedValue(
      new Error('request_failed_404'),
    );

    render(<SoloRaceWorldBest snippetId="snippet-1" />);

    await waitFor(() => {
      expect(screen.getByText('CPM')).toBeDefined();
    });
    expect(screen.getAllByText('N/A')).toHaveLength(4);
  });

  it('renders values from backend world best response', async () => {
    vi.mocked(soloRaceApi.getWorldBest).mockResolvedValue({
      cpm: 142,
      cpmHolderName: 'girlypop',
      durationMs: 50_201,
      timeHolderName: '@girlypop2',
    });

    render(<SoloRaceWorldBest snippetId="snippet-1" />);

    await waitFor(() => {
      expect(screen.getByText('142')).toBeDefined();
    });
    expect(screen.getByText('CPM')).toBeDefined();
    // Formatted the same way as every other duration in the app: m:ss.mmm.
    expect(screen.getByText('0:50.201')).toBeDefined();
    expect(screen.getByText('@girlypop')).toBeDefined();
    expect(screen.getByText('@girlypop2')).toBeDefined();
  });

  it('requests the world best for the given snippet id', async () => {
    vi.mocked(soloRaceApi.getWorldBest).mockResolvedValue({
      cpm: null,
      cpmHolderName: null,
      durationMs: null,
      timeHolderName: null,
    });

    render(<SoloRaceWorldBest snippetId="snippet-42" />);

    await waitFor(() => {
      expect(soloRaceApi.getWorldBest).toHaveBeenCalledWith('snippet-42');
    });
  });
});
