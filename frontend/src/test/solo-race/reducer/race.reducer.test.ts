import { describe, it, expect } from 'vitest';
import { raceReducer, initialState } from '../../../features/solo-race/reducer/race.reducer';
import type { RaceSnippet } from '../../../features/solo-race/types/race.types';

describe('raceReducer', () => {
  const mockSnippet: RaceSnippet = {
    id: '1',
    code: 'const x = 1;',
    type: 'javascript',
  };

  it('should initialize race on SET_RACE', () => {
    const startedAt = new Date().toISOString();
    const state = raceReducer(initialState, {
      type: 'SET_RACE',
      snippet: mockSnippet,
      startedAt,
    });

    expect(state.targetCode).toBe(mockSnippet.code);
    expect(state.startedAt).toBe(startedAt);
    expect(state.acceptedPrefix).toBe('');
  });

  it('should advance acceptedPrefix on correct input', () => {
    let state = raceReducer(initialState, {
      type: 'SET_RACE',
      snippet: mockSnippet,
      startedAt: new Date().toISOString(),
    });

    state = raceReducer(state, { type: 'INPUT', char: 'c' });
    expect(state.acceptedPrefix).toBe('c');
    expect(state.hasError).toBe(false);
    expect(state.pendingVersion).toBe(1);

    state = raceReducer(state, { type: 'INPUT', char: 'o' });
    expect(state.acceptedPrefix).toBe('co');
    expect(state.pendingVersion).toBe(2);
  });

  it('should add to currentInput and set hasError on incorrect input', () => {
    let state = raceReducer(initialState, {
      type: 'SET_RACE',
      snippet: mockSnippet,
      startedAt: new Date().toISOString(),
    });

    state = raceReducer(state, { type: 'INPUT', char: 'x' });
    expect(state.acceptedPrefix).toBe('');
    expect(state.currentInput).toBe('x');
    expect(state.hasError).toBe(true);
    expect(state.pendingVersion).toBe(0);
  });

  it('should not advance acceptedPrefix if there is already currentInput', () => {
    let state = raceReducer(initialState, {
      type: 'SET_RACE',
      snippet: mockSnippet,
      startedAt: new Date().toISOString(),
    });

    state = raceReducer(state, { type: 'INPUT', char: 'x' }); // wrong
    state = raceReducer(state, { type: 'INPUT', char: 'c' }); // right char, but blocked by error
    
    expect(state.acceptedPrefix).toBe('');
    expect(state.currentInput).toBe('xc');
    expect(state.hasError).toBe(true);
  });

  it('should allow correcting input with DELETE', () => {
    let state = raceReducer(initialState, {
      type: 'SET_RACE',
      snippet: mockSnippet,
      startedAt: new Date().toISOString(),
    });

    state = raceReducer(state, { type: 'INPUT', char: 'x' });
    state = raceReducer(state, { type: 'DELETE' });
    
    expect(state.currentInput).toBe('');
    expect(state.hasError).toBe(false);

    state = raceReducer(state, { type: 'INPUT', char: 'c' });
    expect(state.acceptedPrefix).toBe('c');
  });

  it('should handle Unicode surrogate pairs', () => {
    const emojiSnippet: RaceSnippet = {
      id: '2',
      code: '🚀',
      type: 'text',
    };
    let state = raceReducer(initialState, {
      type: 'SET_RACE',
      snippet: emojiSnippet,
      startedAt: new Date().toISOString(),
    });

    state = raceReducer(state, { type: 'INPUT', char: '🚀' });
    expect(state.acceptedPrefix).toBe('🚀');
  });

  it('should not delete accepted prefix when currentInput is empty', () => {
    let state = raceReducer(initialState, {
      type: 'SET_RACE',
      snippet: mockSnippet,
      startedAt: new Date().toISOString(),
    });

    state = raceReducer(state, { type: 'INPUT', char: 'c' });
    state = raceReducer(state, { type: 'DELETE' });

    expect(state.acceptedPrefix).toBe('c');
    expect(state.currentInput).toBe('');
  });

  it('should rebase local state when progress is rejected', () => {
    let state = raceReducer(initialState, {
      type: 'SET_RACE',
      snippet: mockSnippet,
      startedAt: new Date().toISOString(),
    });

    state = raceReducer(state, { type: 'INPUT', char: 'c' });
    state = raceReducer(state, { type: 'INPUT', char: 'o' });
    state = raceReducer(state, { type: 'REJECT', serverOffset: 1, reason: 'stale_version' });

    expect(state.acceptedPrefix).toBe('c');
    expect(state.serverOffset).toBe(1);
    expect(state.currentInput).toBe('');
    expect(state.unackedCount).toBe(0);
    expect(state.transportError).toBe('stale_version');
  });

  it('should acknowledge in-order versions only', () => {
    let state = raceReducer(initialState, {
      type: 'SET_RACE',
      snippet: mockSnippet,
      startedAt: new Date().toISOString(),
    });

    state = raceReducer(state, { type: 'INPUT', char: 'c' });
    state = raceReducer(state, { type: 'INPUT', char: 'o' });
    state = raceReducer(state, { type: 'ACKNOWLEDGE', version: 2, serverOffset: 2 });
    const withStaleAck = raceReducer(state, { type: 'ACKNOWLEDGE', version: 1, serverOffset: 1 });

    expect(withStaleAck.ackedVersion).toBe(2);
    expect(withStaleAck.serverOffset).toBe(2);
  });

  it('should ignore input and delete after expiry or finish', () => {
    const base = raceReducer(initialState, {
      type: 'SET_RACE',
      snippet: mockSnippet,
      startedAt: new Date().toISOString(),
    });

    const expired = raceReducer(base, { type: 'EXPIRE' });
    expect(raceReducer(expired, { type: 'INPUT', char: 'c' })).toEqual(expired);
    expect(raceReducer(expired, { type: 'DELETE' })).toEqual(expired);

    const finished = raceReducer(base, { type: 'FINISH' });
    expect(raceReducer(finished, { type: 'INPUT', char: 'c' })).toEqual(finished);
    expect(raceReducer(finished, { type: 'DELETE' })).toEqual(finished);
  });

  it('should bound acknowledged server offset and clear transport error', () => {
    let state = raceReducer(initialState, {
      type: 'SET_RACE',
      snippet: { ...mockSnippet, code: 'abc' },
      startedAt: new Date().toISOString(),
    });

    state = raceReducer(state, { type: 'TRANSPORT_FAILURE', reason: 'x' });
    state = raceReducer(state, { type: 'INPUT', char: 'a' });
    state = raceReducer(state, { type: 'ACKNOWLEDGE', version: 1, serverOffset: 50 });
    expect(state.serverOffset).toBe(3);
    expect(state.isOffline).toBe(false);
    expect(state.transportError).toBeNull();
  });

  it('should clamp reject offset and reset error/input state', () => {
    let state = raceReducer(initialState, {
      type: 'SET_RACE',
      snippet: { ...mockSnippet, code: 'abc' },
      startedAt: new Date().toISOString(),
    });

    state = raceReducer(state, { type: 'INPUT', char: 'a' });
    state = raceReducer(state, { type: 'INPUT', char: 'x' });
    state = raceReducer(state, { type: 'REJECT', serverOffset: 99 });

    expect(state.acceptedPrefix).toBe('abc');
    expect(state.serverOffset).toBe(3);
    expect(state.currentInput).toBe('');
    expect(state.hasError).toBe(false);
    expect(state.transportError).toBe('progress_rejected');
  });

  it('should track transport online and completion-request actions', () => {
    let state = raceReducer(initialState, {
      type: 'SET_RACE',
      snippet: mockSnippet,
      startedAt: new Date().toISOString(),
    });

    state = raceReducer(state, { type: 'TRANSPORT_FAILURE', reason: 'down' });
    expect(state.isOffline).toBe(true);
    expect(state.transportError).toBe('down');

    state = raceReducer(state, { type: 'TRANSPORT_ONLINE' });
    expect(state.isOffline).toBe(false);
    expect(state.transportError).toBeNull();

    state = raceReducer(state, { type: 'REQUEST_COMPLETION' });
    expect(state.completionRequested).toBe(true);
  });

  it('should return current state for unknown action type', () => {
    const state = raceReducer(initialState, {
      type: 'SET_RACE',
      snippet: mockSnippet,
      startedAt: new Date().toISOString(),
    });

    // @ts-expect-error testing unknown action type
    const unchanged = raceReducer(state, { type: 'UNKNOWN_ACTION' });
    expect(unchanged).toEqual(state);
  });

  it('should ignore input when no remaining code exists', () => {
    let state = raceReducer(initialState, {
      type: 'SET_RACE',
      snippet: { id: 'done', code: 'a', type: 'text' },
      startedAt: new Date().toISOString(),
    });

    state = raceReducer(state, { type: 'INPUT', char: 'a' });
    const afterDone = raceReducer(state, { type: 'INPUT', char: 'x' });
    expect(afterDone).toEqual(state);
  });

  it('should set default transport failure reason when missing', () => {
    const state = raceReducer(initialState, { type: 'TRANSPORT_FAILURE' });
    expect(state.transportError).toBe('transport_failure');
    expect(state.isOffline).toBe(true);
  });
});
