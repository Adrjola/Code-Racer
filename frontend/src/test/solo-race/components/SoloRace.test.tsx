import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SoloRace } from '../../../features/solo-race/components/SoloRace';
import { processBeforeInputData } from '../../../features/solo-race/components/processBeforeInputData';
import { useCountdown } from '../../../features/solo-race/hooks/useCountdown';
import { useExactCodeTypingEngine } from '../../../features/solo-race/hooks/useExactCodeTypingEngine';
import { soloRaceApi } from '../../../features/solo-race/api/soloRaceApi';
import type {
  RaceSnippet,
  RaceState,
} from '../../../features/solo-race/types/race.types';

vi.mock('../../../features/solo-race/hooks/useExactCodeTypingEngine', () => ({
  useExactCodeTypingEngine: vi.fn(),
}));

vi.mock('../../../features/solo-race/hooks/useCountdown', () => ({
  useCountdown: vi.fn(() => null),
}));

vi.mock('../../../features/solo-race/api/soloRaceApi', async () => {
  const actual = await vi.importActual<
    typeof import('../../../features/solo-race/api/soloRaceApi')
  >('../../../features/solo-race/api/soloRaceApi');
  return {
    ...actual,
    soloRaceApi: {
      ...actual.soloRaceApi,
      getWorldBest: vi.fn(),
    },
  };
});

describe('SoloRace Component', () => {
  const mockSnippet: RaceSnippet = {
    id: 'snippet-1',
    code: 'const x = 1;',
    type: 'javascript',
  };
  const startedAt = new Date().toISOString();

  function createRaceState(overrides: Partial<RaceState> = {}): RaceState {
    return {
      snippet: mockSnippet,
      targetCode: mockSnippet.code,
      serverOffset: 0,
      acceptedPrefix: '',
      currentInput: '',
      pendingVersion: 0,
      ackedVersion: 0,
      unackedCount: 0,
      isFinished: false,
      isExpired: false,
      isOffline: false,
      transportError: null,
      completionRequested: false,
      hasError: false,
      startedAt,
      result: null,
      ...overrides,
    };
  }

  function mockTypingEngine(
    stateOverrides: Partial<RaceState> = {},
    handlers: Partial<ReturnType<typeof useExactCodeTypingEngine>> = {},
  ) {
    vi.mocked(useExactCodeTypingEngine).mockReturnValue({
      state: createRaceState(stateOverrides),
      handleInput: vi.fn(),
      handleDelete: vi.fn(),
      markExpired: vi.fn(),
      flushNow: vi.fn(async () => undefined),
      ...handlers,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCountdown).mockReturnValue(null);
    vi.mocked(soloRaceApi.getWorldBest).mockRejectedValue(
      new Error('request_failed_404'),
    );
  });

  it('renders solo race stats row and header actions', () => {
    mockTypingEngine();

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);

    expect(screen.getByLabelText('typing progress')).toBeDefined();
    expect(screen.getByText('restart race')).toBeDefined();
  });

  it('locks input until the user starts the race', () => {
    const handleDelete = vi.fn();
    mockTypingEngine({ currentInput: 'x' }, { handleDelete });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    const textarea = screen.getByRole('textbox', { hidden: true });

    fireEvent.keyDown(textarea, { key: 'Backspace' });
    expect(handleDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /start race/i }));
    fireEvent.keyDown(textarea, { key: 'Backspace' });

    expect(handleDelete).toHaveBeenCalledTimes(1);
  });

  it('handles Tab like IDE indentation input after start', () => {
    const handleInput = vi.fn();
    mockTypingEngine(
      {
        targetCode: '   abc',
      },
      { handleInput },
    );

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    fireEvent.click(screen.getByRole('button', { name: /start race/i }));
    const textarea = screen.getByRole('textbox', { hidden: true });

    const tabEvent = fireEvent.keyDown(textarea, { key: 'Tab' });

    expect(tabEvent).toBe(false);
    expect(handleInput).toHaveBeenCalledTimes(3);
    expect(handleInput).toHaveBeenNthCalledWith(1, ' ');
    expect(handleInput).toHaveBeenNthCalledWith(2, ' ');
    expect(handleInput).toHaveBeenNthCalledWith(3, ' ');
  });

  it('restarts race on Ctrl+Enter only after the race begins', () => {
    const onRestartRace = vi.fn();
    mockTypingEngine();

    render(
      <SoloRace
        onRestartRace={onRestartRace}
        snippet={mockSnippet}
        startedAt={startedAt}
      />,
    );
    const textarea = screen.getByRole('textbox', { hidden: true });

    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    expect(onRestartRace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /start race/i }));
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    expect(onRestartRace).toHaveBeenCalledTimes(1);
  });

  it('returns to the pre-start menu on Escape after the race begins', () => {
    mockTypingEngine();

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    const textarea = screen.getByRole('textbox', { hidden: true });

    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(screen.getByRole('button', { name: /start race/i })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /start race/i }));
    expect(screen.queryByRole('button', { name: /start race/i })).toBeNull();

    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(screen.getByRole('button', { name: /start race/i })).toBeDefined();
  });

  it('prevents paste and drop', () => {
    mockTypingEngine();

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    const textarea = screen.getByRole('textbox', { hidden: true });

    expect(fireEvent.paste(textarea)).toBe(false);
    expect(fireEvent.drop(textarea)).toBe(false);
  });

  it('shows server-countdown value and keeps input locked while countdown is active', () => {
    const handleDelete = vi.fn();
    vi.mocked(useCountdown).mockReturnValue(3);
    mockTypingEngine({}, { handleDelete });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    fireEvent.click(screen.getByRole('button', { name: /start race/i }));

    expect(screen.getByText(/^3$/)).toBeDefined();
    fireEvent.keyDown(screen.getByRole('textbox', { hidden: true }), {
      key: 'Backspace',
    });
    expect(handleDelete).not.toHaveBeenCalled();
  });

  it('blurs code hint text before race start and clears it after start', () => {
    mockTypingEngine();

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    const codePreview = screen.getByText('const x = 1;').closest('pre');

    expect(codePreview?.className).toContain('blur-[2px]');

    fireEvent.click(screen.getByRole('button', { name: /start race/i }));
    expect(codePreview?.className).not.toContain('blur-[2px]');
  });

  it('renders incorrect input segment when currentInput exists', () => {
    mockTypingEngine({ currentInput: 'x' });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);

    expect(screen.getByText('x')).toBeDefined();
  });

  it('shows 0:00 before start as fallback elapsed time', () => {
    mockTypingEngine();

    render(
      <SoloRace snippet={mockSnippet} startedAt="1970-01-01T00:00:00.000Z" />,
    );

    expect(screen.getByText('0:00')).toBeDefined();
  });

  it('hides world best menu once race starts', () => {
    mockTypingEngine();

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);

    expect(screen.getByText('WORLD BEST')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /start race/i }));

    expect(screen.queryByText('WORLD BEST')).toBeNull();
    expect(screen.queryByRole('button', { name: /start race/i })).toBeNull();
  });

  it('progress bar uses accepted code only, not current mistyped chars', () => {
    mockTypingEngine({
      targetCode: '1234567890',
      acceptedPrefix: '123',
      currentInput: 'abcd',
    });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);

    expect(screen.getByLabelText('typing progress')).toHaveStyle({
      width: '30%',
    });
  });

  it('processBeforeInputData forwards each character', () => {
    const handleInput = vi.fn();
    const preventDefault = vi.fn();

    processBeforeInputData(false, 'ab', handleInput, preventDefault);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(handleInput).toHaveBeenNthCalledWith(1, 'a');
    expect(handleInput).toHaveBeenNthCalledWith(2, 'b');
  });

  it('processBeforeInputData ignores locked and empty input data', () => {
    const handleInput = vi.fn();
    const preventDefault = vi.fn();

    processBeforeInputData(true, 'z', handleInput, preventDefault);
    processBeforeInputData(false, '', handleInput, preventDefault);
    processBeforeInputData(false, null, handleInput, preventDefault);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(handleInput).not.toHaveBeenCalled();
  });

  it('does not render a finished state label when race is complete', () => {
    mockTypingEngine({ isFinished: true });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);

    expect(screen.queryByText('Race Finished!')).toBeNull();
  });
});
