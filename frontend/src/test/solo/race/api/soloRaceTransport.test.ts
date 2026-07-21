import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSoloRaceTransport } from '../../../../features/solo/race/api/soloRaceTransport';
import type { SoloAttemptResultResponse } from '../../../../features/solo/race/api/soloRaceApi';
import { saveSession } from '@/features/auth/session';
import { server } from '@/test/server';

const API_URL = 'http://localhost:8080';
const ATTEMPT_ID = 'attempt-1';
const PROGRESS_URL = `${API_URL}/api/solo-attempts/${ATTEMPT_ID}/progress`;

const batch = {
  events: [
    { value: 'a', version: 1 },
    { value: 'b', version: 2 },
  ],
};

const result: SoloAttemptResultResponse = {
  attemptId: ATTEMPT_ID,
  cpm: 420,
  difficulty: 'EASY',
  durationMs: 45_000,
  finishedAt: '2026-07-17T12:00:45Z',
  snippet: {
    categoryId: 'c1',
    snippetId: 'g1',
    title: 'FizzBuzz',
  },
  startedAt: '2026-07-17T12:00:00Z',
  state: 'COMPLETED',
};

beforeEach(() => {
  saveSession({
    accessToken: 'jwt-token',
    expiresAt: Date.now() + 60_000,
    tokenType: 'Bearer',
    user: {
      createdAt: '2026-07-16T12:00:00Z',
      email: 'player@example.com',
      emailVerified: true,
      id: 'u1',
      role: 'USER',
      updatedAt: '2026-07-16T12:00:00Z',
      username: 'player',
    },
  });
});

describe('createSoloRaceTransport', () => {
  it('sends the batched characters with the last version', async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post(PROGRESS_URL, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          data: { acceptedOffset: 2, attemptId: ATTEMPT_ID, state: 'ACTIVE' },
        });
      }),
    );

    const ack =
      await createSoloRaceTransport(ATTEMPT_ID).sendProgressBatch(batch);

    // One request is one sequence number, however many characters it carries.
    expect(body).toEqual({ characters: 'ab', sequence: 1 });
    expect(ack).toEqual({ serverOffset: 2, version: 2 });
  });

  it('reports the finished result when the attempt completes', async () => {
    const onResult = vi.fn();
    server.use(
      http.post(PROGRESS_URL, () => HttpResponse.json({ data: result })),
    );

    const ack = await createSoloRaceTransport(ATTEMPT_ID, {
      onResult,
    }).sendProgressBatch(batch);

    expect(onResult).toHaveBeenCalledWith(result);
    // The completing batch carries no acceptedOffset, so the whole batch counts.
    expect(ack).toEqual({ serverOffset: 2, version: 2 });
  });

  it('does not report a result while the attempt is still running', async () => {
    const onResult = vi.fn();
    server.use(
      http.post(PROGRESS_URL, () =>
        HttpResponse.json({
          data: { acceptedOffset: 1, attemptId: ATTEMPT_ID, state: 'ACTIVE' },
        }),
      ),
    );

    await createSoloRaceTransport(ATTEMPT_ID, { onResult }).sendProgressBatch(
      batch,
    );

    expect(onResult).not.toHaveBeenCalled();
  });

  it('attaches the bearer token to progress calls', async () => {
    let authorization: string | null = null;
    server.use(
      http.post(PROGRESS_URL, ({ request }) => {
        authorization = request.headers.get('Authorization');
        return HttpResponse.json({
          data: { acceptedOffset: 2, attemptId: ATTEMPT_ID, state: 'ACTIVE' },
        });
      }),
    );

    await createSoloRaceTransport(ATTEMPT_ID).sendProgressBatch(batch);

    expect(authorization).toBe('Bearer jwt-token');
  });

  it('numbers requests consecutively rather than by character version', async () => {
    const sequences: unknown[] = [];
    server.use(
      http.post(PROGRESS_URL, async ({ request }) => {
        const body = (await request.json()) as { sequence: number };
        sequences.push(body.sequence);
        return HttpResponse.json({
          data: {
            acceptedOffset: sequences.length * 2,
            attemptId: ATTEMPT_ID,
            state: 'ACTIVE',
          },
        });
      }),
    );
    const transport = createSoloRaceTransport(ATTEMPT_ID);

    await transport.sendProgressBatch(batch);
    await transport.sendProgressBatch({
      events: [
        { value: 'c', version: 3 },
        { value: 'd', version: 4 },
      ],
    });

    // The server rejects anything that is not lastSequence + 1.
    expect(sequences).toEqual([1, 2]);
  });

  it('reuses the sequence number after a failed send', async () => {
    const sequences: unknown[] = [];
    let calls = 0;
    server.use(
      http.post(PROGRESS_URL, async ({ request }) => {
        calls += 1;
        const body = (await request.json()) as { sequence: number };
        sequences.push(body.sequence);
        if (calls === 1) {
          return HttpResponse.error();
        }
        return HttpResponse.json({
          data: { acceptedOffset: 2, attemptId: ATTEMPT_ID, state: 'ACTIVE' },
        });
      }),
    );
    const transport = createSoloRaceTransport(ATTEMPT_ID);

    await expect(transport.sendProgressBatch(batch)).rejects.toBeTruthy();
    await transport.sendProgressBatch(batch);

    expect(sequences).toEqual([1, 1]);
  });

  it('propagates a failed progress call so the engine can retry', async () => {
    server.use(http.post(PROGRESS_URL, () => HttpResponse.error()));

    await expect(
      createSoloRaceTransport(ATTEMPT_ID).sendProgressBatch(batch),
    ).rejects.toBeTruthy();
  });
});
