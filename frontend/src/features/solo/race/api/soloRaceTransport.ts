import {
  isProgressAck,
  soloRaceApi,
  type SoloAttemptResultResponse,
} from './soloRaceApi';
import { isSessionExpiredError } from '@/lib/apiClient';
import type {
  ExactCodeTypingEngineTransport,
  ProgressAcknowledge,
  ProgressBatch,
} from '../types/race.types';

export type SoloRaceTransportOptions = {
  /** Called when the server rejects progress because the session is no longer valid. */
  onSessionExpired?: () => void;
  /**
   * Called once the server reports the attempt COMPLETED. The result carries the
   * authoritative duration and cpm, so the UI never computes them itself.
   */
  onResult?: (result: SoloAttemptResultResponse) => void;
};

export function createSoloRaceTransport(
  attemptId: string,
  options: SoloRaceTransportOptions = {},
): ExactCodeTypingEngineTransport {
  // The server takes one delta per sequence number and demands each request be
  // exactly lastSequence + 1. Event versions count characters, not requests, so
  // the transport keeps its own request counter: batching two keystrokes would
  // otherwise skip a number and be rejected with PROGRESS_SEQUENCE_CONFLICT.
  let sequence = 0;
  let acceptedOffset = 0;

  return {
    async sendProgressBatch(
      batch: ProgressBatch,
    ): Promise<ProgressAcknowledge> {
      const last = batch.events[batch.events.length - 1];
      const characters = batch.events.map((event) => event.value).join('');
      const nextSequence = sequence + 1;
      let response;
      try {
        response = await soloRaceApi.submitProgress(
          attemptId,
          nextSequence,
          characters,
        );
      } catch (error: unknown) {
        // A token that expires mid-race fails every send from here on, so send
        // the player to log in rather than letting the race die silently.
        if (isSessionExpiredError(error)) {
          options.onSessionExpired?.();
        }
        throw error;
      }

      // Advance only once the server has taken the delta, so a failed send is
      // retried under the same number instead of skipping one.
      sequence = nextSequence;

      if (isProgressAck(response)) {
        acceptedOffset = response.acceptedOffset;
        return { serverOffset: acceptedOffset, version: last.version };
      }

      // The batch that finishes the attempt answers with the result rather than
      // an ack. This is the only point the server hands the result over.
      acceptedOffset += [...characters].length;
      options.onResult?.(response);
      return { serverOffset: acceptedOffset, version: last.version };
    },
    async submitCompletion() {
      return;
    },
  };
}
