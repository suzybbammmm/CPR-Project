import { useCallback, useEffect, useRef, useState } from 'react';
import { getLeaderboard } from '../api/leaderboard';
import type { LeaderboardMeta } from '../api/leaderboard';
import type { LeaderboardEntry, LeaderboardStats } from '../types/exhibition.types';

const POLL_INTERVAL_MS = 15_000;

export function useLeaderboard(options?: { limit?: number; autoRefresh?: boolean; eventId?: number | 'all' }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<LeaderboardStats>({ todayParticipants: 0, totalAttempts: 0 });
  const [meta, setMeta] = useState<LeaderboardMeta>({ eventId: null, eventName: null, eventActive: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLeaderboard({ limit: options?.limit ?? 20, eventId: options?.eventId });
      setEntries(data.entries);
      setStats(data.stats);
      setMeta(data.meta);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '랭킹을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [options?.limit, options?.eventId]);

  useEffect(() => {
    refresh();
    if (options?.autoRefresh !== false) {
      timerRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refresh, options?.autoRefresh]);

  return { entries, stats, meta, loading, error, refresh };
}
