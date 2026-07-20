export interface RaceSnippet {
  id: string;
  code: string;
  type: string;
}

export interface ProgressEvent {
  version: number;
  value: string;
}

export interface ProgressBatch {
  events: ProgressEvent[];
}

export interface ProgressAcknowledge {
  version: number;
  serverOffset: number;
}

export interface RaceState {
  snippet: RaceSnippet;
  // Immutable backend-provided sequence
  targetCode: string;
  // Characters accepted by the server (authoritative)
  serverOffset: number;
  // Local optimistic prefix that matches targetCode
  acceptedPrefix: string;
  // Current user input that hasn't been "accepted" as a match yet (might be wrong)
  currentInput: string;
  // Version for ordering events
  pendingVersion: number;
  // Acked version from server
  ackedVersion: number;
  // Number of progress events accepted locally but not acknowledged by server yet
  unackedCount: number;
  // Is the race finished
  isFinished: boolean;
  // Did the race expire on server side
  isExpired: boolean;
  // Transport/network availability indicator
  isOffline: boolean;
  // Last transport error text
  transportError: string | null;
  // Ensure completion request is issued only once
  completionRequested: boolean;
  // Error state for current input
  hasError: boolean;
  // Start time from backend
  startedAt: string | null;
}

export type RaceAction =
  | { type: 'INPUT'; char: string }
  | { type: 'DELETE' }
  | { type: 'ACKNOWLEDGE'; version: number; serverOffset: number }
  | { type: 'REJECT'; serverOffset: number; reason?: string }
  | { type: 'TRANSPORT_FAILURE'; reason?: string }
  | { type: 'TRANSPORT_ONLINE' }
  | { type: 'EXPIRE' }
  | { type: 'REQUEST_COMPLETION' }
  | { type: 'SET_RACE'; snippet: RaceSnippet; startedAt: string }
  | { type: 'FINISH' };

export interface ExactCodeTypingEngineTransport {
  sendProgressBatch(batch: ProgressBatch): Promise<ProgressAcknowledge>;
  submitCompletion(payload: { version: number }): Promise<void>;
}
