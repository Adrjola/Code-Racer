import type {
  ExactCodeTypingEngineTransport,
  ProgressAcknowledge,
  ProgressBatch,
} from '../types/race.types';
import {
  soloRaceApi,
  type ProgressAckResponse,
  type SubmitProgressResponse,
} from './soloRaceApi';

function isProgressAck(
  response: SubmitProgressResponse,
): response is ProgressAckResponse {
  return 'acceptedOffset' in response;
}

export function createSoloRaceTransport(
  attemptId: string,
): ExactCodeTypingEngineTransport {
  let nextSequence = 1;

  return {
    async sendProgressBatch(
      batch: ProgressBatch,
    ): Promise<ProgressAcknowledge> {
      const last = batch.events[batch.events.length - 1];
      const characters = batch.events.map((event) => event.value).join('');
      const sequence = nextSequence;
      const response = await soloRaceApi.submitProgress(
        attemptId,
        sequence,
        characters,
      );
      nextSequence += 1;

      if (isProgressAck(response)) {
        return {
          version: last.version,
          serverOffset: response.acceptedOffset,
          completed: false,
        };
      }

      return {
        version: last.version,
        serverOffset: last.version,
        completed: true,
        result: {
          cpm: response.cpm,
          durationMs: response.durationMs,
          finishedAt: response.finishedAt,
          state: response.state,
        },
      };
    },
    async submitCompletion() {
      return;
    },
  };
}
