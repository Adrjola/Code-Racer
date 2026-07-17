import type { ExactCodeTypingEngineTransport, ProgressBatch, ProgressAcknowledge } from '../types/race.types';
import { soloRaceApi, type ProgressAckResponse, type SubmitProgressResponse } from './soloRaceApi';

function isProgressAck(response: SubmitProgressResponse): response is ProgressAckResponse {
  return 'acceptedOffset' in response;
}

export function createSoloRaceTransport(attemptId: string): ExactCodeTypingEngineTransport {
  return {
    async sendProgressBatch(batch: ProgressBatch): Promise<ProgressAcknowledge> {
      const last = batch.events[batch.events.length - 1];
      const characters = batch.events.map((event) => event.value).join('');
      const response = await soloRaceApi.submitProgress(attemptId, last.version, characters);

      return {
        version: last.version,
        serverOffset: isProgressAck(response) ? response.acceptedOffset : characters.length,
      };
    },
    async submitCompletion() {
      return;
    },
  };
}
