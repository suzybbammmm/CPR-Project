import { apiFetch } from './client';
import type { AttemptPayload, SaveAttemptResult } from '../types/exhibition.types';

interface RawSaveResult {
  success: boolean;
  attempt_id: number;
  score: number | null;
  grade: string | null;
  xp: number;
  max_combo: number;
  score_corrected: boolean;
  existing: boolean;
}

export async function saveAttempt(payload: AttemptPayload): Promise<SaveAttemptResult> {
  const raw = await apiFetch<RawSaveResult>('/api/v1/attempts', {
    method: 'POST',
    body: JSON.stringify({
      attempt_uuid: payload.attemptUuid,
      session_uuid: payload.sessionUuid,
      student_number: payload.studentNumber,
      name: payload.name,
      phone: payload.phone ?? null,
      player_order: payload.playerOrder,
      elapsed_seconds: payload.elapsedSeconds,
      victim_type: payload.victimType,
      score: payload.score,
      compression_events: payload.compressionEvents,
    }),
  });
  return {
    attemptId: raw.attempt_id,
    score: raw.score,
    grade: raw.grade,
    xp: raw.xp,
    maxCombo: raw.max_combo,
    scoreCorrected: raw.score_corrected,
    existing: raw.existing,
  };
}
