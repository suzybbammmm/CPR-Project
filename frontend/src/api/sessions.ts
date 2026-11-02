import { apiFetch } from './client';

export async function createSession(payload: {
  sessionUuid: string;
  victimType: string;
  playerCount: number;
  mode: 'live' | 'demo';
}): Promise<{ sessionId: number }> {
  return apiFetch('/api/v1/sessions', {
    method: 'POST',
    body: JSON.stringify({
      session_uuid: payload.sessionUuid,
      victim_type: payload.victimType,
      player_count: payload.playerCount,
      mode: payload.mode,
    }),
  });
}
