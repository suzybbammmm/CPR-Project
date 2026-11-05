import { apiFetch } from './client';

export async function adminLogin(password: string): Promise<void> {
  await apiFetch('/api/v1/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function adminLogout(): Promise<void> {
  await apiFetch('/api/v1/admin/logout', { method: 'POST' });
}

export interface AdminStats {
  sensorConnected: boolean;
  lastSensorAt: number | null;
  activeEvent: { id: number; name: string } | null;
  stats: {
    todayParticipants: number;
    totalAttempts: number;
    dbPath: string;
  };
}

export async function getAdminStats(): Promise<AdminStats> {
  const raw = await apiFetch<{
    sensor_connected: boolean;
    last_sensor_at: number | null;
    active_event: { id: number; name: string } | null;
    stats: { today_participants: number; total_attempts: number; db_path: string };
  }>('/api/v1/admin/stats');
  return {
    sensorConnected: raw.sensor_connected,
    lastSensorAt: raw.last_sensor_at,
    activeEvent: raw.active_event,
    stats: {
      todayParticipants: raw.stats.today_participants,
      totalAttempts: raw.stats.total_attempts,
      dbPath: raw.stats.db_path,
    },
  };
}

export interface AdminAttempt {
  id: number;
  attemptUuid: string;
  playerOrder: number;
  victimType: string;
  score: number | null;
  grade: string | null;
  xp: number;
  maxCombo: number;
  compressionCount: number;
  observedCount: number;
  missingCount: number;
  averageDepth: number | null;
  averageBpm: number | null;
  averageRecoil: number | null;
  depthGoodPercent: number | null;
  rateGoodPercent: number | null;
  elapsedSeconds: number | null;
  completedAt: string;
  invalidatedAt: string | null;
  invalidatedReason: string | null;
  studentNumber: string;
  name: string;
  phone: string | null;
}

export async function getAdminAttempts(options?: {
  page?: number;
  perPage?: number;
  search?: string;
  victimType?: string;
  grade?: string;
}): Promise<{ attempts: AdminAttempt[]; total: number; page: number; perPage: number }> {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', String(options.page));
  if (options?.perPage) params.set('per_page', String(options.perPage));
  if (options?.search) params.set('search', options.search);
  if (options?.victimType) params.set('victim_type', options.victimType);
  if (options?.grade) params.set('grade', options.grade);

  const raw = await apiFetch<{
    attempts: Record<string, unknown>[];
    total: number;
    page: number;
    per_page: number;
  }>(`/api/v1/admin/attempts?${params}`);

  return {
    attempts: (raw.attempts as Record<string, unknown>[]).map((r) => ({
      id: r.id as number,
      attemptUuid: r.attempt_uuid as string,
      playerOrder: r.player_order as number,
      victimType: (r.victim_type as string) ?? 'adult',
      score: r.score as number | null,
      grade: r.grade as string | null,
      xp: r.xp as number,
      maxCombo: r.max_combo as number,
      compressionCount: r.compression_count as number,
      observedCount: r.observed_count as number,
      missingCount: r.missing_count as number,
      averageDepth: r.average_depth as number | null,
      averageBpm: r.average_bpm as number | null,
      averageRecoil: r.average_recoil as number | null,
      depthGoodPercent: r.depth_good_percent as number | null,
      rateGoodPercent: r.rate_good_percent as number | null,
      elapsedSeconds: r.elapsed_seconds as number | null,
      completedAt: r.completed_at as string,
      invalidatedAt: r.invalidated_at as string | null,
      invalidatedReason: r.invalidated_reason as string | null,
      studentNumber: (r.student_number as string) ?? '',
      name: (r.name as string) ?? '',
      phone: (r.phone as string | null) ?? null,
    })),
    total: raw.total,
    page: raw.page,
    perPage: raw.per_page,
  };
}

export async function invalidateAttempt(id: number, reason: string): Promise<void> {
  await apiFetch(`/api/v1/admin/attempts/${id}/invalidate`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function restoreAttempt(id: number): Promise<void> {
  await apiFetch(`/api/v1/admin/attempts/${id}/restore`, { method: 'POST' });
}

export async function createEvent(payload: {
  name: string;
  venue?: string;
  victimType?: string;
  playerCount?: number;
}): Promise<{ eventId: number }> {
  const raw = await apiFetch<{ event_id: number }>('/api/v1/admin/events', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      venue: payload.venue ?? '',
      victim_type: payload.victimType ?? 'adult',
      player_count: payload.playerCount ?? 1,
    }),
  });
  return { eventId: raw.event_id };
}

export async function finalizeEvent(id: number): Promise<void> {
  await apiFetch(`/api/v1/admin/events/${id}/finalize`, { method: 'POST' });
}

export function getExportCsvUrl(): string {
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:8766';
  return `${base}/api/v1/admin/export.csv`;
}

export function getBackupUrl(): string {
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:8766';
  return `${base}/api/v1/admin/backup`;
}
