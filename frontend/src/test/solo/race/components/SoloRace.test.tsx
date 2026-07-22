import { render, screen, fireEvent, act } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { SoloRace } from '../../../../features/solo/race/components/SoloRace';
import { processBeforeInputData } from '../../../../features/solo/race/utils/processBeforeInputData';
import { useExactCodeTypingEngine } from '../../../../features/solo/race/hooks/useExactCodeTypingEngine';
import { useCountdown } from '../../../../features/solo/race/hooks/useCountdown';
import { soloRaceApi } from '../../../../features/solo/race/api/soloRaceApi';

// Mock the hooks
vi.mock(
  '../../../../features/solo/race/hooks/useExactCodeTypingEngine',
  () => ({
    useExactCodeTypingEngine: vi.fn(),
  }),
);

vi.mock('../../../../features/solo/race/hooks/useCountdown', () => ({
  useCountdown: vi.fn(() => null),
}));

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

type TypingEngine = ReturnType<typeof useExactCodeTypingEngine>;

const mockCountdown = vi.mocked(useCountdown);
const mockGetWorldBest = vi.mocked(soloRaceApi.getWorldBest);

// The tests only need part of the engine's surface, so the partial state is cast
// once here instead of at every call site.
const mockEngine = (value: unknown) =>
  vi.mocked(useExactCodeTypingEngine).mockReturnValue(value as TypingEngine);

describe('SoloRace Component', () => {
  const mockSnippet = { id: '1', code: 'const x = 1;', type: 'javascript' };
  const startedAt = new Date().toISOString();

  const baseHookState = {
    state: {
      targetCode: 'const x = 1;',
      acceptedPrefix: '',
      currentInput: '',
      isFinished: false,
      hasError: false,
      snippet: { type: 'javascript' },
    },
    handleInput: vi.fn(),
    handleDelete: vi.fn(),
  };

  beforeEach(() => {
    mockCountdown.mockReturnValue(null);
    mockGetWorldBest.mockRejectedValue(new Error('request_failed_404'));
  });

  it('renders solo race stats row', () => {
    mockEngine(baseHookState);

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    expect(screen.getByLabelText('typing progress')).toBeDefined();
    expect(screen.getByText('restart race')).toBeDefined();
  });

  it('calls handleDelete on Backspace', () => {
    const mockHandleDelete = vi.fn();
    mockEngine({
      state: {
        targetCode: 'abc',
        acceptedPrefix: '',
        currentInput: 'x',
        isFinished: false,
        snippet: { type: 'js' },
      },
      handleInput: vi.fn(),
      handleDelete: mockHandleDelete,
    });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    fireEvent.click(screen.getByRole('button', { name: /start race/i }));
    const textarea = screen.getByRole('textbox', { hidden: true });

    fireEvent.keyDown(textarea, { key: 'Backspace' });
    expect(mockHandleDelete).toHaveBeenCalled();
  });

  it('handles Tab like IDE indentation input', () => {
    const mockHandleInput = vi.fn();
    mockEngine({
      state: {
        targetCode: '\tabc',
        acceptedPrefix: '',
        currentInput: '',
        isFinished: false,
        snippet: { type: 'js' },
      },
      handleInput: mockHandleInput,
      handleDelete: vi.fn(),
    });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    fireEvent.click(screen.getByRole('button', { name: /start race/i }));
    const textarea = screen.getByRole('textbox', { hidden: true });

    const tabEvent = fireEvent.keyDown(textarea, { key: 'Tab' });
    expect(tabEvent).toBe(false);
    expect(mockHandleInput).toHaveBeenCalledTimes(3);
    expect(mockHandleInput).toHaveBeenNthCalledWith(1, ' ');
    expect(mockHandleInput).toHaveBeenNthCalledWith(2, ' ');
    expect(mockHandleInput).toHaveBeenNthCalledWith(3, ' ');
  });

  it('restarts race on Ctrl+Enter shortcut after race begins', () => {
    mockEngine(baseHookState);
    const onRestartRace = vi.fn();

    render(
      <SoloRace
        snippet={mockSnippet}
        startedAt={startedAt}
        onRestartRace={onRestartRace}
      />,
    );
    const textarea = screen.getByRole('textbox', { hidden: true });

    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    expect(onRestartRace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /start race/i }));
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    expect(onRestartRace).toHaveBeenCalledTimes(1);
  });

  it('leaves the active race on Escape after race begins', async () => {
    mockEngine(baseHookState);
    const onLobbyNavigate = vi.fn();

    render(
      <SoloRace
        snippet={mockSnippet}
        startedAt={startedAt}
        onLobbyNavigate={onLobbyNavigate}
      />,
    );
    const textarea = screen.getByRole('textbox', { hidden: true });

    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(onLobbyNavigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /start race/i }));
    expect(screen.queryByRole('button', { name: /start race/i })).toBeNull();

    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Escape' });
    });

    expect(onLobbyNavigate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /start race/i })).toBeDefined();
  });

  it('does nothing on non-tab/non-backspace key press', () => {
    const mockHandleInput = vi.fn();
    const mockHandleDelete = vi.fn();
    mockEngine({
      state: {
        targetCode: 'abc',
        acceptedPrefix: '',
        currentInput: '',
        isFinished: false,
        snippet: { type: 'js' },
      },
      handleInput: mockHandleInput,
      handleDelete: mockHandleDelete,
    });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    fireEvent.click(screen.getByRole('button', { name: /start race/i }));
    const textarea = screen.getByRole('textbox', { hidden: true });
    fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(mockHandleInput).not.toHaveBeenCalled();
    expect(mockHandleDelete).not.toHaveBeenCalled();
  });

  it('prevents paste and drop', () => {
    mockEngine(baseHookState);
    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    const textarea = screen.getByRole('textbox', { hidden: true });

    const pasteEvent = fireEvent.paste(textarea);
    expect(pasteEvent).toBe(false); // preventDefault returns false in fireEvent if handled

    const dropEvent = fireEvent.drop(textarea);
    expect(dropEvent).toBe(false);
  });

  it('shows centered 3-second countdown and locks input before start', () => {
    mockCountdown.mockReturnValue(3);
    const handleDelete = vi.fn();
    mockEngine({
      ...baseHookState,
      handleDelete,
    });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    fireEvent.click(screen.getByRole('button', { name: /start race/i }));
    expect(screen.getByText(/^3$/)).toBeDefined();

    const textarea = screen.getByRole('textbox', { hidden: true });
    fireEvent.keyDown(textarea, { key: 'Backspace' });
    expect(handleDelete).not.toHaveBeenCalled();
  });

  it('blurs the code until the server countdown elapses', () => {
    mockEngine(baseHookState);
    // Three seconds still to wait on the server's clock.
    mockCountdown.mockReturnValue(3);

    const { rerender } = render(
      <SoloRace snippet={mockSnippet} startedAt={startedAt} />,
    );

    const codePreview = screen.getByText('const x = 1;').closest('pre');
    expect(codePreview?.className).toContain('blur-[2px]');

    fireEvent.click(screen.getByRole('button', { name: /start race/i }));
    expect(codePreview?.className).toContain('blur-[2px]');

    mockCountdown.mockReturnValue(0);
    rerender(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    expect(codePreview?.className).not.toContain('blur-[2px]');
  });

  it('renders incorrect input segment when currentInput exists', () => {
    mockEngine({
      ...baseHookState,
      state: {
        ...baseHookState.state,
        currentInput: 'x',
      },
    });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    expect(screen.getByText('x')).toBeDefined();
  });

  it('shows 0:00 before start as fallback elapsed time', () => {
    mockEngine(baseHookState);

    render(
      <SoloRace snippet={mockSnippet} startedAt={'1970-01-01T00:00:00.000Z'} />,
    );

    expect(screen.getByText('0:00')).toBeDefined();
  });

  it('keeps input locked until the server countdown elapses', () => {
    const mockHandleDelete = vi.fn();
    mockEngine({
      state: {
        targetCode: 'abc',
        acceptedPrefix: '',
        currentInput: '',
        isFinished: false,
        snippet: { type: 'js' },
      },
      handleInput: vi.fn(),
      handleDelete: mockHandleDelete,
    });

    mockCountdown.mockReturnValue(3);
    const { rerender } = render(
      <SoloRace snippet={mockSnippet} startedAt={startedAt} />,
    );
    const textarea = screen.getByRole('textbox', { hidden: true });

    fireEvent.keyDown(textarea, { key: 'Backspace' });
    expect(mockHandleDelete).not.toHaveBeenCalled();

    // Started, but the server's start time has not arrived yet.
    fireEvent.click(screen.getByRole('button', { name: /start race/i }));
    fireEvent.keyDown(textarea, { key: 'Backspace' });
    expect(mockHandleDelete).not.toHaveBeenCalled();

    mockCountdown.mockReturnValue(0);
    rerender(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    fireEvent.keyDown(textarea, { key: 'Backspace' });
    expect(mockHandleDelete).toHaveBeenCalledTimes(1);
  });

  it('hides world best menu once race starts', () => {
    mockEngine(baseHookState);

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    expect(screen.getByText('WORLD BEST')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /start race/i }));

    expect(screen.queryByText('WORLD BEST')).toBeNull();
    expect(screen.queryByRole('button', { name: /start race/i })).toBeNull();
  });

  it('progress bar uses accepted code only, not current mistyped chars', () => {
    mockEngine({
      ...baseHookState,
      state: {
        ...baseHookState.state,
        targetCode: '1234567890',
        acceptedPrefix: '123',
        currentInput: 'abcd',
      },
    });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);

    const progress = screen.getByLabelText('typing progress');
    expect(progress).toHaveStyle({ width: '30%' });
  });

  it('processBeforeInputData forwards each character', () => {
    const mockHandleInput = vi.fn();
    const mockPreventDefault = vi.fn();

    processBeforeInputData(false, 'ab', mockHandleInput, mockPreventDefault);

    expect(mockPreventDefault).toHaveBeenCalledTimes(1);
    expect(mockHandleInput).toHaveBeenNthCalledWith(1, 'a');
    expect(mockHandleInput).toHaveBeenNthCalledWith(2, 'b');
  });

  it('processBeforeInputData ignores locked and empty input data', () => {
    const mockHandleInput = vi.fn();
    const mockPreventDefault = vi.fn();

    processBeforeInputData(true, 'z', mockHandleInput, mockPreventDefault);
    processBeforeInputData(false, '', mockHandleInput, mockPreventDefault);
    processBeforeInputData(false, null, mockHandleInput, mockPreventDefault);

    expect(mockPreventDefault).not.toHaveBeenCalled();
    expect(mockHandleInput).not.toHaveBeenCalled();
  });

  it('ignores backspace while locked', () => {
    mockCountdown.mockReturnValue(1);
    const handleDelete = vi.fn();
    mockEngine({
      ...baseHookState,
      handleDelete,
    });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    const textarea = screen.getByRole('textbox', { hidden: true });
    fireEvent.keyDown(textarea, { key: 'Backspace' });
    expect(handleDelete).not.toHaveBeenCalled();
  });

  it('does not render finished state label when race is complete', () => {
    mockEngine({
      ...baseHookState,
      state: {
        ...baseHookState.state,
        isFinished: true,
      },
    });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    expect(screen.queryByText('Race Finished!')).toBeNull();
  });
});
