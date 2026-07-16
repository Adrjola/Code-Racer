import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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

  it('renders snippet type', () => {
    (useExactCodeTypingEngine as any).mockReturnValue(baseHookState);

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    expect(screen.getByText('javascript')).toBeDefined();
  });

  it('calls handleDelete on Backspace', () => {
    const mockHandleDelete = vi.fn();
    (useExactCodeTypingEngine as any).mockReturnValue({
      state: { targetCode: 'abc', acceptedPrefix: '', currentInput: 'x', isFinished: false, snippet: { type: 'js' } },
      handleInput: vi.fn(),
      handleDelete: mockHandleDelete,
    });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    const textarea = screen.getByRole('textbox', { hidden: true });
    
    fireEvent.keyDown(textarea, { key: 'Backspace' });
    expect(mockHandleDelete).toHaveBeenCalled();
  });

  it('handles Tab like IDE indentation input', () => {
    const mockHandleInput = vi.fn();
    (useExactCodeTypingEngine as any).mockReturnValue({
      state: { targetCode: '\tabc', acceptedPrefix: '', currentInput: '', isFinished: false, snippet: { type: 'js' } },
      handleInput: mockHandleInput,
      handleDelete: vi.fn(),
    });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    const textarea = screen.getByRole('textbox', { hidden: true });

    const tabEvent = fireEvent.keyDown(textarea, { key: 'Tab' });
    expect(tabEvent).toBe(false);
    expect(mockHandleInput).toHaveBeenCalledWith('\t');
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

  it('shows countdown and locks input before start', () => {
    (useCountdown as any).mockReturnValue(3);
    const handleDelete = vi.fn();
    (useExactCodeTypingEngine as any).mockReturnValue({ ...baseHookState, handleDelete });

    render(<SoloRace snippet={mockSnippet} startedAt={startedAt} />);
    expect(screen.getByText('Starts in 3s')).toBeDefined();

    const textarea = screen.getByRole('textbox', { hidden: true });
    fireEvent.keyDown(textarea, { key: 'Backspace' });
    expect(handleDelete).not.toHaveBeenCalled();
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
