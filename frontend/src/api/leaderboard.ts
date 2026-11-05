import { apiFetch } from './client';
import type { LeaderboardEntry, LeaderboardStats } from '../types/exhibition.types';

interface RawEntry {
  rank: number;
  participant_id?: number;
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

  // Records created by the backend process that was already running during the
  // scoring update are version 1, while newly restarted servers save version 2.
  // Fetch both so a deployment transition never makes real participants vanish.
  const fetchVersion = (version: 1 | 2) => {
    const versionParams = new URLSearchParams(params);
    versionParams.set('scoring_version', String(version));
    return apiFetch<RawLeaderboardResponse>(`/api/v1/leaderboard?${versionParams}`);
  };
  const [legacy, current] = await Promise.all([fetchVersion(1), fetchVersion(2)]);

  const bestByParticipant = new Map<string, RawEntry>();
  for (const entry of [...legacy.entries, ...current.entries]) {
    const key = entry.participant_id != null
      ? `id:${entry.participant_id}`
      : `${entry.masked_student_number}:${entry.masked_name}`;
    const previous = bestByParticipant.get(key);
    const score = entry.score ?? -1;
    const previousScore = previous?.score ?? -1;
    if (!previous || score > previousScore
      || (score === previousScore && entry.max_combo > previous.max_combo)) {
      bestByParticipant.set(key, entry);
    }
  }
  const mergedEntries = [...bestByParticipant.values()]
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1)
      || b.depth_good_percent - a.depth_good_percent
      || b.rate_good_percent - a.rate_good_percent
      || b.max_combo - a.max_combo)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  const raw = current;

  return {
    entries: mergedEntries.map((e) => ({
      rank: e.rank,
      maskedName: e.masked_name,
      maskedStudentNumber: e.masked_student_number,
      score: e.score ?? 0,
      grade: e.grade ?? '—',
      xp: e.xp,
      maxCombo: e.max_combo,
      depthGoodPercent: e.depth_good_percent,
      rateGoodPercent: e.rate_good_percent,
      attemptCount: e.attempt_count ?? 1,
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
