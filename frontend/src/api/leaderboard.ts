import { apiFetch } from './client';
import type { LeaderboardEntry, LeaderboardStats } from '../types/exhibition.types';

interface RawEntry {
  rank: number;
  masked_name: string;
  masked_student_number: string;
  score: number | null;
  grade: string | null;
  xp: number;
  max_combo: number;
  depth_good_percent: number;
  rate_good_percent: number;
  attempt_count: number;
  achieved_at: string;
}

interface RawEventInfo {
  id: number;
  name: string;
  is_active: number;
  ended_at: string | null;
}

interface RawLeaderboardResponse {
  entries: RawEntry[];
  stats: { today_participants: number; total_attempts: number };
  event_id: number | null;
  event_info: RawEventInfo | null;
}

export interface LeaderboardMeta {
  eventId: number | null;
  eventName: string | null;
  eventActive: boolean;
}

export async function getLeaderboard(options?: {
  limit?: number;
  victimType?: string;
  eventId?: number | 'all';
}): Promise<{ entries: LeaderboardEntry[]; stats: LeaderboardStats; meta: LeaderboardMeta }> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.victimType) params.set('victim_type', options.victimType);
  if (options?.eventId !== undefined) params.set('event_id', String(options.eventId));

  const raw = await apiFetch<RawLeaderboardResponse>(
    `/api/v1/leaderboard?${params}`,
  );

  return {
    entries: raw.entries.map((e) => ({
      rank: e.rank,
      maskedName: e.masked_name,
      maskedStudentNumber: e.masked_student_number,
      score: e.score ?? 0,
      grade: e.grade ?? '—',
      xp: e.xp,
      maxCombo: e.max_combo,
      depthGoodPercent: e.depth_good_percent,
      rateGoodPercent: e.rate_good_percent,
      attemptCount: e.attempt_count,
      achievedAt: e.achieved_at,
    })),
    stats: {
      todayParticipants: raw.stats?.today_participants ?? 0,
      totalAttempts: raw.stats?.total_attempts ?? 0,
    },
    meta: {
      eventId: raw.event_id,
      eventName: raw.event_info?.name ?? null,
      eventActive: (raw.event_info?.is_active ?? 0) === 1,
    },
  };
}

interface PersonalBestResult {
  best: {
    score: number;
    grade: string;
    xp: number;
    max_combo: number;
    achieved_at: string;
  } | null;
  attempt_count: number;
}

export async function getPersonalBest(studentNumber: string): Promise<PersonalBestResult> {
  const params = new URLSearchParams({ student_number: studentNumber });
  return apiFetch<PersonalBestResult>(`/api/v1/leaderboard/personal?${params}`);
}
