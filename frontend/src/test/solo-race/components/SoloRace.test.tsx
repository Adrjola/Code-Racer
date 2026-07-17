import { render, screen, fireEvent, act } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { SoloRace, processBeforeInputData } from '../../../features/solo-race/components/SoloRace';
import { useExactCodeTypingEngine } from '../../../features/solo-race/hooks/useExactCodeTypingEngine';
import { useCountdown } from '../../../features/solo-race/hooks/useCountdown';

// Mock the hooks
vi.mock('../../../features/solo-race/hooks/useExactCodeTypingEngine', () => ({
  useExactCodeTypingEngine: vi.fn(),
}));

vi.mock('../../../features/solo-race/hooks/useCountdown', () => ({
  useCountdown: vi.fn(() => null)
}));

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
      snippet: { type: 'javascript' }
    },
    handleInput: vi.fn(),
    handleDelete: vi.fn(),
  };

  beforeEach(() => {
    (useCountdown as any).mockReturnValue(null);
  });

  const finishStartCountdown = () => {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  };

  it('renders solo race stats row', () => {
    (useExactCodeTypingEngine as any).mockReturnValue(baseHookState);

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    expect(screen.getByLabelText('typing progress')).toBeDefined();
    expect(screen.getByText('restart race')).toBeDefined();
  });

  it('calls handleDelete on Backspace', () => {
    vi.useFakeTimers();
    const mockHandleDelete = vi.fn();
    (useExactCodeTypingEngine as any).mockReturnValue({
      state: { targetCode: 'abc', acceptedPrefix: '', currentInput: 'x', isFinished: false, snippet: { type: 'js' } },
      handleInput: vi.fn(),
      handleDelete: mockHandleDelete,
    });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    fireEvent.click(screen.getByRole('button', { name: /start race/i }));
    finishStartCountdown();
    const textarea = screen.getByRole('textbox', { hidden: true });
    
    fireEvent.keyDown(textarea, { key: 'Backspace' });
    expect(mockHandleDelete).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('handles Tab like IDE indentation input', () => {
    vi.useFakeTimers();
    const mockHandleInput = vi.fn();
    (useExactCodeTypingEngine as any).mockReturnValue({
      state: { targetCode: '\tabc', acceptedPrefix: '', currentInput: '', isFinished: false, snippet: { type: 'js' } },
      handleInput: mockHandleInput,
      handleDelete: vi.fn(),
    });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    fireEvent.click(screen.getByRole('button', { name: /start race/i }));
    finishStartCountdown();
    const textarea = screen.getByRole('textbox', { hidden: true });

    const tabEvent = fireEvent.keyDown(textarea, { key: 'Tab' });
    expect(tabEvent).toBe(false);
    expect(mockHandleInput).toHaveBeenCalledTimes(3);
    expect(mockHandleInput).toHaveBeenNthCalledWith(1, ' ');
    expect(mockHandleInput).toHaveBeenNthCalledWith(2, ' ');
    expect(mockHandleInput).toHaveBeenNthCalledWith(3, ' ');
    vi.useRealTimers();
  });

  it('restarts race on Ctrl+Enter shortcut after race begins', () => {
    vi.useFakeTimers();
    (useExactCodeTypingEngine as any).mockReturnValue(baseHookState);
    const onRestartRace = vi.fn();

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} onRestartRace={onRestartRace} />);
    const textarea = screen.getByRole('textbox', { hidden: true });

    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    expect(onRestartRace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /start race/i }));
    finishStartCountdown();
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    expect(onRestartRace).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('terminates race and returns to pre-start menu on Escape after race begins', () => {
    vi.useFakeTimers();
    (useExactCodeTypingEngine as any).mockReturnValue(baseHookState);
    const onLobbyNavigate = vi.fn();

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} onLobbyNavigate={onLobbyNavigate} />);
    const textarea = screen.getByRole('textbox', { hidden: true });

    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(onLobbyNavigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /start race/i }));
    finishStartCountdown();
    expect(screen.queryByRole('button', { name: /start race/i })).toBeNull();

    fireEvent.keyDown(textarea, { key: 'Escape' });

    expect(onLobbyNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /start race/i })).toBeDefined();
    vi.useRealTimers();
  });

  it('does nothing on non-tab/non-backspace key press', () => {
    const mockHandleInput = vi.fn();
    const mockHandleDelete = vi.fn();
    (useExactCodeTypingEngine as any).mockReturnValue({
      state: { targetCode: 'abc', acceptedPrefix: '', currentInput: '', isFinished: false, snippet: { type: 'js' } },
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
     (useExactCodeTypingEngine as any).mockReturnValue(baseHookState);
    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    const textarea = screen.getByRole('textbox', { hidden: true });
    
    const pasteEvent = fireEvent.paste(textarea);
    expect(pasteEvent).toBe(false); // preventDefault returns false in fireEvent if handled

    const dropEvent = fireEvent.drop(textarea);
    expect(dropEvent).toBe(false);
  });

  it('shows centered 3-second countdown and locks input before start', () => {
    (useCountdown as any).mockReturnValue(3);
    const handleDelete = vi.fn();
    (useExactCodeTypingEngine as any).mockReturnValue({ ...baseHookState, handleDelete });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    fireEvent.click(screen.getByRole('button', { name: /start race/i }));
    expect(screen.getByText(/^3$/)).toBeDefined();

    const textarea = screen.getByRole('textbox', { hidden: true });
    fireEvent.keyDown(textarea, { key: 'Backspace' });
    expect(handleDelete).not.toHaveBeenCalled();
  });

  it('blurs code hint text before race start', () => {
    vi.useFakeTimers();
    (useExactCodeTypingEngine as any).mockReturnValue(baseHookState);

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);

    const codePreview = screen.getByText('const x = 1;').closest('pre');
    expect(codePreview?.className).toContain('blur-[2px]');

    fireEvent.click(screen.getByRole('button', { name: /start race/i }));
    expect(codePreview?.className).toContain('blur-[2px]');

    finishStartCountdown();
    expect(codePreview?.className).not.toContain('blur-[2px]');
    vi.useRealTimers();
  });

  it('renders incorrect input segment when currentInput exists', () => {
    (useExactCodeTypingEngine as any).mockReturnValue({
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
    (useExactCodeTypingEngine as any).mockReturnValue(baseHookState);

    render(<SoloRace snippet={mockSnippet} startedAt={'1970-01-01T00:00:00.000Z'} />);

    expect(screen.getByText('0:00')).toBeDefined();
  });

  it('keeps input locked until start race is pressed', () => {
    vi.useFakeTimers();
    const mockHandleDelete = vi.fn();
    (useExactCodeTypingEngine as any).mockReturnValue({
      state: { targetCode: 'abc', acceptedPrefix: '', currentInput: '', isFinished: false, snippet: { type: 'js' } },
      handleInput: vi.fn(),
      handleDelete: mockHandleDelete,
    });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    const textarea = screen.getByRole('textbox', { hidden: true });

    fireEvent.keyDown(textarea, { key: 'Backspace' });
    expect(mockHandleDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /start race/i }));
    fireEvent.keyDown(textarea, { key: 'Backspace' });
    expect(mockHandleDelete).not.toHaveBeenCalled();

    finishStartCountdown();
    fireEvent.keyDown(textarea, { key: 'Backspace' });
    expect(mockHandleDelete).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('hides world best menu once race starts', () => {
    (useExactCodeTypingEngine as any).mockReturnValue(baseHookState);

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    expect(screen.getByText('WORLD BEST')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /start race/i }));

    expect(screen.queryByText('WORLD BEST')).toBeNull();
    expect(screen.queryByRole('button', { name: /start race/i })).toBeNull();
  });

  it('progress bar uses accepted code only, not current mistyped chars', () => {
    (useExactCodeTypingEngine as any).mockReturnValue({
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
    (useCountdown as any).mockReturnValue(1);
    const handleDelete = vi.fn();
    (useExactCodeTypingEngine as any).mockReturnValue({ ...baseHookState, handleDelete });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    const textarea = screen.getByRole('textbox', { hidden: true });
    fireEvent.keyDown(textarea, { key: 'Backspace' });
    expect(handleDelete).not.toHaveBeenCalled();
  });

  it('renders finished state label when race is complete', () => {
    (useExactCodeTypingEngine as any).mockReturnValue({
      ...baseHookState,
      state: {
        ...baseHookState.state,
        isFinished: true,
      },
    });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    expect(screen.getByText('Race Finished!')).toBeDefined();
  });
});
