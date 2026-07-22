import type { RaceAction, RaceState } from '../types/race.types';
import {
  codePointAt,
  codePointLength,
  sliceCodePoints,
} from '../utils/codePointText';

/**
 * How many wrong characters may pile up before further input is ignored. Without
 * a cap, holding a key that is not the next character grows the rendered code by
 * one character per keypress, and newlines push it off the screen entirely.
 */
export const MAX_INCORRECT_INPUT = 8;

export const initialState: RaceState = {
  snippet: { id: '', code: '', type: '' },
  targetCode: '',
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
  startedAt: null,
  result: null,
};

export function raceReducer(state: RaceState, action: RaceAction): RaceState {
  switch (action.type) {
    case 'SET_RACE':
      return {
        ...initialState,
        snippet: action.snippet,
        targetCode: action.snippet.code,
        startedAt: action.startedAt,
      };

    case 'INPUT': {
      if (state.isFinished || state.isExpired) return state;

      const acceptedOffset = codePointLength(state.acceptedPrefix);
      const nextChar = codePointAt(state.targetCode, acceptedOffset);
      if (!nextChar) return state;

      const isCorrect = action.char === nextChar;

      if (
        isCorrect &&
        !state.hasError &&
        codePointLength(state.currentInput) === 0
      ) {
        const newAcceptedPrefix = state.acceptedPrefix + action.char;
        return {
          ...state,
          acceptedPrefix: newAcceptedPrefix,
          pendingVersion: state.pendingVersion + 1,
          unackedCount: state.unackedCount + 1,
          hasError: false,
          transportError: null,
        };
      }

      if (codePointLength(state.currentInput) >= MAX_INCORRECT_INPUT) {
        return state;
      }

      return {
        ...state,
        currentInput: state.currentInput + action.char,
        hasError: true,
      };
    }

    case 'DELETE': {
      if (state.isFinished || state.isExpired) return state;
      if (codePointLength(state.currentInput) === 0) return state;

      const newCurrentInput = sliceCodePoints(state.currentInput, 0, -1);
      return {
        ...state,
        currentInput: newCurrentInput,
        hasError: newCurrentInput.length > 0,
      };
    }

    case 'ACKNOWLEDGE': {
      if (action.version <= state.ackedVersion) return state;

      const boundedOffset = Math.max(
        0,
        Math.min(action.serverOffset, codePointLength(state.targetCode)),
      );
      const ackDelta = action.version - state.ackedVersion;
      return {
        ...state,
        ackedVersion: action.version,
        serverOffset: boundedOffset,
        unackedCount: Math.max(0, state.unackedCount - Math.max(0, ackDelta)),
        isOffline: false,
        transportError: null,
      };
    }

    case 'REJECT': {
      const boundedOffset = Math.max(
        0,
        Math.min(action.serverOffset, codePointLength(state.targetCode)),
      );
      const resetPrefix = sliceCodePoints(state.targetCode, 0, boundedOffset);
      return {
        ...state,
        acceptedPrefix: resetPrefix,
        serverOffset: boundedOffset,
        pendingVersion: Math.max(state.pendingVersion, state.ackedVersion),
        unackedCount: 0,
        currentInput: '',
        hasError: false,
        transportError: action.reason ?? 'progress_rejected',
      };
    }

    case 'TRANSPORT_FAILURE':
      return {
        ...state,
        isOffline: true,
        transportError: action.reason ?? 'transport_failure',
      };

    case 'TRANSPORT_ONLINE':
      return {
        ...state,
        isOffline: false,
        transportError: null,
      };

    case 'EXPIRE':
      return {
        ...state,
        isExpired: true,
      };

    case 'REQUEST_COMPLETION':
      return {
        ...state,
        completionRequested: true,
      };

    case 'FINISH':
      return {
        ...state,
        isFinished: true,
        result: action.result ?? state.result,
      };

    default:
      return state;
  }
}
