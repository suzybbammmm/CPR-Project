import { afterEach, expect, it, vi } from 'vitest';
import { getLeaderboard } from './leaderboard';

afterEach(() => vi.unstubAllGlobals());

it('merges legacy and current scoring records without hiding real participants', async () => {
  const responses = {
    '1': [
      { rank: 1, participant_id: 1, masked_name: '제*', masked_student_number: '202***830', score: 6, grade: 'D', xp: 1, max_combo: 0, depth_good_percent: 100, rate_good_percent: 12, attempt_count: 1, achieved_at: 'old' },
      { rank: 2, participant_id: 2, masked_name: '김*', masked_student_number: '202***809', score: null, grade: null, xp: 0, max_combo: 0, depth_good_percent: 0, rate_good_percent: 0, attempt_count: 1, achieved_at: 'old' },
    ],
    '2': [
      { rank: 1, participant_id: 1, masked_name: '제*', masked_student_number: '202***830', score: 75, grade: 'B', xp: 15, max_combo: 1, depth_good_percent: 90, rate_good_percent: 90, attempt_count: 2, achieved_at: 'new' },
      { rank: 2, participant_id: 3, masked_name: '권*', masked_student_number: '202***801', score: 50, grade: 'D', xp: 10, max_combo: 0, depth_good_percent: 80, rate_good_percent: 70, attempt_count: 1, achieved_at: 'new' },
    ],
  };
  const fetch = vi.fn(async (url: string) => {
    const version = new URL(url).searchParams.get('scoring_version') as '1' | '2';
    return { ok: true, json: async () => ({ entries: responses[version], stats: { today_participants: 3, total_attempts: 4 }, event_id: 1, event_info: { id: 1, name: '자동 생성', is_active: 1, ended_at: null } }) };
  });
  vi.stubGlobal('fetch', fetch);

  const result = await getLeaderboard({ limit: 100 });

  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls.map(([url]) => new URL(url).searchParams.get('scoring_version')).sort()).toEqual(['1', '2']);
  expect(result.entries.map(entry => [entry.rank, entry.maskedName, entry.score])).toEqual([
    [1, '제*', 75], [2, '권*', 50], [3, '김*', 0],
  ]);
});
