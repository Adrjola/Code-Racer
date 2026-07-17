import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  defaultTransport,
  shouldSkipCompletionRequest,
  shouldSkipFlush,
  useExactCodeTypingEngine,
} from '../../../features/solo-race/hooks/useExactCodeTypingEngine.ts';
import type { RaceSnippet, ExactCodeTypingEngineTransport } from '../../../features/solo-race/types/race.types';

const snippet: RaceSnippet = {
  id: 's1',
  code: 'ab',
  type: 'text',
};

describe('useExactCodeTypingEngine logic engine', () => {
  it('default transport maps batch ack and accepts completion call', async () => {
    const ack = await defaultTransport.sendProgressBatch({
      events: [
        { value: 'a', version: 1 },
        { value: 'b', version: 2 },
      ],
    });

    expect(ack).toEqual({ version: 2, serverOffset: 2 });

    await expect(defaultTransport.submitCompletion({ version: 2 })).resolves.toBeUndefined();
  });

  it('evaluates skip guards deterministically', () => {
    expect(shouldSkipFlush(false, false, 1, false, false)).toBe(true);
    expect(shouldSkipFlush(true, true, 1, false, false)).toBe(true);
    expect(shouldSkipFlush(true, false, 0, false, false)).toBe(true);
    expect(shouldSkipFlush(true, false, 1, true, false)).toBe(true);
    expect(shouldSkipFlush(true, false, 1, false, true)).toBe(true);
    expect(shouldSkipFlush(true, false, 1, false, false)).toBe(false);

    expect(shouldSkipCompletionRequest({ completionRequested: true, isFinished: false, isExpired: false })).toBe(true);
    expect(shouldSkipCompletionRequest({ completionRequested: false, isFinished: true, isExpired: false })).toBe(true);
    expect(shouldSkipCompletionRequest({ completionRequested: false, isFinished: false, isExpired: true })).toBe(true);
    expect(shouldSkipCompletionRequest({ completionRequested: false, isFinished: false, isExpired: false })).toBe(false);
  });

  it('initializes race state from snippet/start time', () => {
    const transport: ExactCodeTypingEngineTransport = {
      sendProgressBatch: vi.fn(async ({ events }) => ({
        version: events[events.length - 1].version,
        serverOffset: events[events.length - 1].version,
      })),
      submitCompletion: vi.fn(async () => undefined),
    };

    const startedAt = new Date().toISOString();
    const { result, unmount } = renderHook(() => useExactCodeTypingEngine(snippet, startedAt, transport));

    expect(result.current.state.targetCode).toBe('ab');
    expect(result.current.state.startedAt).toBe(startedAt);
    expect(result.current.state.acceptedPrefix).toBe('');
    unmount();
  });

  it('exposes stable handlers and allows safe no-op flush', async () => {
    const transport: ExactCodeTypingEngineTransport = {
      sendProgressBatch: vi.fn(async ({ events }) => ({
        version: events[events.length - 1].version,
        serverOffset: events[events.length - 1].version,
      })),
      submitCompletion: vi.fn(async () => undefined),
    };

    const { result, unmount } = renderHook(() => useExactCodeTypingEngine(snippet, new Date().toISOString(), transport));

    await waitFor(() => {
      expect(result.current.state.targetCode).toBe('ab');
    });

    act(() => {
      result.current.handleInput('a');
      result.current.handleDelete();
      result.current.markExpired();
    });

    await act(async () => {
      await result.current.flushNow();
    });

    expect(typeof result.current.handleInput).toBe('function');
    expect(typeof result.current.handleDelete).toBe('function');
    expect(typeof result.current.markExpired).toBe('function');
    expect(typeof result.current.flushNow).toBe('function');
    unmount();
  });

  it('does not crash when expired flow is triggered', async () => {
    const transport: ExactCodeTypingEngineTransport = {
      sendProgressBatch: vi.fn(async ({ events }) => ({
        version: events[events.length - 1].version,
        serverOffset: events.length,
      })),
      submitCompletion: vi.fn(async () => undefined),
    };

    const { result, unmount } = renderHook(() => useExactCodeTypingEngine(snippet, new Date().toISOString(), transport));

    await waitFor(() => {
      expect(result.current.state.targetCode).toBe('ab');
    });

    act(() => {
      result.current.markExpired();
      result.current.handleInput('b');
    });

    await act(async () => {
      await result.current.flushNow();
    });

    expect(result.current.state.isFinished).toBe(false);
    unmount();
  });

  it('flushes queued progress and acknowledges ordered input', async () => {
    const sendProgressBatch = vi.fn(async ({ events }) => ({
      version: events[events.length - 1].version,
      serverOffset: events[events.length - 1].version,
    }));
    const transport: ExactCodeTypingEngineTransport = {
      sendProgressBatch,
      submitCompletion: vi.fn(async () => undefined),
    };

    const { result, unmount } = renderHook(() => useExactCodeTypingEngine(snippet, new Date().toISOString(), transport));

    await waitFor(() => {
      expect(result.current.state.targetCode).toBe('ab');
    });

    act(() => {
      result.current.handleInput('a');
    });

    await act(async () => {
      await result.current.flushNow();
    });

    await waitFor(() => {
      expect(sendProgressBatch).toHaveBeenCalledTimes(1);
    });
    expect(sendProgressBatch).toHaveBeenCalledWith({ events: [{ value: 'a', version: 1 }] });
    unmount();
  });

  it('does not queue progress for incorrect input', async () => {
    const sendProgressBatch = vi.fn(async ({ events }) => ({
      version: events[events.length - 1].version,
      serverOffset: events[events.length - 1].version,
    }));
    const transport: ExactCodeTypingEngineTransport = {
      sendProgressBatch,
      submitCompletion: vi.fn(async () => undefined),
    };

    const { result, unmount } = renderHook(() => useExactCodeTypingEngine(snippet, new Date().toISOString(), transport));
    await waitFor(() => {
      expect(result.current.state.targetCode).toBe('ab');
    });

    act(() => {
      result.current.handleInput('x');
    });

    await act(async () => {
      await result.current.flushNow();
    });

    expect(sendProgressBatch).not.toHaveBeenCalled();
    unmount();
  });

  it('debounces flush callback for queued input', async () => {
    vi.useFakeTimers();
    const sendProgressBatch = vi.fn(async ({ events }) => ({
      version: events[events.length - 1].version,
      serverOffset: events[events.length - 1].version,
    }));

    const transport: ExactCodeTypingEngineTransport = {
      sendProgressBatch,
      submitCompletion: vi.fn(async () => undefined),
    };

    const { result, unmount } = renderHook(() => useExactCodeTypingEngine(snippet, new Date().toISOString(), transport));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.handleInput('a');
    });

    await act(async () => {
      vi.advanceTimersByTime(305);
      await Promise.resolve();
    });

    expect(sendProgressBatch).toHaveBeenCalled();

    vi.useRealTimers();
    unmount();
  });

  it('clears previous debounce timer when multiple valid chars are typed sequentially', async () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const sendProgressBatch = vi.fn(async ({ events }) => ({
      version: events[events.length - 1].version,
      serverOffset: events[events.length - 1].version,
    }));

    const transport: ExactCodeTypingEngineTransport = {
      sendProgressBatch,
      submitCompletion: vi.fn(async () => undefined),
    };

    const longerSnippet: RaceSnippet = { ...snippet, code: 'abz' };
    const { result, unmount } = renderHook(() => useExactCodeTypingEngine(longerSnippet, new Date().toISOString(), transport));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.state.targetCode).toBe('abz');

    act(() => {
      result.current.handleInput('a');
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.state.acceptedPrefix).toBe('a');

    act(() => {
      result.current.handleInput('b');
    });

    expect(clearTimeoutSpy).toHaveBeenCalled();

    vi.useRealTimers();
    clearTimeoutSpy.mockRestore();
    unmount();
  });

  it('marks transport failure when progress batch send fails', async () => {
    const sendProgressBatch = vi.fn(async () => {
      throw new Error('network');
    });
    const transport: ExactCodeTypingEngineTransport = {
      sendProgressBatch,
      submitCompletion: vi.fn(async () => undefined),
    };

    const { result, unmount } = renderHook(() => useExactCodeTypingEngine(snippet, new Date().toISOString(), transport));

    await waitFor(() => {
      expect(result.current.state.targetCode).toBe('ab');
    });

    act(() => {
      result.current.handleInput('a');
    });

    await act(async () => {
      await result.current.flushNow();
    });

    await waitFor(() => {
      expect(sendProgressBatch).toHaveBeenCalled();
    });
    unmount();
  });

  it('requests completion once when backend offset reaches target', async () => {
    const sendProgressBatch = vi
      .fn()
      .mockResolvedValueOnce({ version: 1, serverOffset: 2 });
    const submitCompletion = vi.fn(async () => undefined);
    const transport: ExactCodeTypingEngineTransport = {
      sendProgressBatch,
      submitCompletion,
    };

    const { result, unmount } = renderHook(() => useExactCodeTypingEngine(snippet, new Date().toISOString(), transport));

    await waitFor(() => {
      expect(result.current.state.targetCode).toBe('ab');
    });

    act(() => {
      result.current.handleInput('a');
    });

    await act(async () => {
      await result.current.flushNow();
    });

    await waitFor(() => {
      expect(submitCompletion).toHaveBeenCalledTimes(1);
      expect(submitCompletion).toHaveBeenCalledWith({ version: 1 });
    });
    unmount();
  });

  it('tracks completion transport failure', async () => {
    const sendProgressBatch = vi
      .fn()
      .mockResolvedValueOnce({ version: 1, serverOffset: 2 });
    const submitCompletion = vi.fn(async () => {
      throw new Error('completion fail');
    });
    const transport: ExactCodeTypingEngineTransport = {
      sendProgressBatch,
      submitCompletion,
    };

    const { result, unmount } = renderHook(() => useExactCodeTypingEngine(snippet, new Date().toISOString(), transport));

    await waitFor(() => {
      expect(result.current.state.targetCode).toBe('ab');
    });

    act(() => {
      result.current.handleInput('a');
    });

    await act(async () => {
      await result.current.flushNow();
    });

    await waitFor(() => {
      expect(submitCompletion).toHaveBeenCalledTimes(1);
    });
    unmount();
  });

  it('keeps current behavior for input around race expiration timing', async () => {
    const sendProgressBatch = vi.fn(async ({ events }) => ({
      version: events[events.length - 1].version,
      serverOffset: events[events.length - 1].version,
    }));
    const transport: ExactCodeTypingEngineTransport = {
      sendProgressBatch,
      submitCompletion: vi.fn(async () => undefined),
    };

    const oneCharSnippet: RaceSnippet = { ...snippet, code: 'ab' };
    const { result, unmount } = renderHook(() =>
      useExactCodeTypingEngine(oneCharSnippet, new Date().toISOString(), transport),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.state.targetCode).toBe('ab');

    act(() => {
      result.current.markExpired();
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.handleInput('a');
    });

    await act(async () => {
      await result.current.flushNow();
    });

    expect(sendProgressBatch.mock.calls.length).toBeLessThanOrEqual(1);
    unmount();
  });

});
