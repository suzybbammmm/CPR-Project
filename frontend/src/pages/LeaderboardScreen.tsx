import { useState } from 'react';
import { HeartPulse, RefreshCw, Trophy } from 'lucide-react';
import '../leaderboard.css';
import { useLeaderboard } from '../hooks/useLeaderboard';
import type { LeaderboardEntry } from '../types/exhibition.types';

const GRADE_COLOR: Record<string, string> = { S: '#a16207', A: '#2563eb', B: '#9a5b25', C: '#47658f', D: '#64748b' };

function PodiumCard({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className={`lb-podium-slot rank-${entry.rank}`}>
      <div className="lb-podium-card" aria-label={`${entry.rank}위: ${entry.maskedName}, ${entry.score}점`}>
        <span className="lb-rank-badge">
          {entry.rank}위
        </span>
        <Trophy size={20} aria-hidden />
        <p className="lb-card-name">{entry.maskedName}</p>
        <p className="lb-card-sn">{entry.maskedStudentNumber}</p>
        <p className="lb-card-score">{entry.score ?? 0}<small>점</small></p>
        <p className="lb-card-grade">등급 {entry.grade ?? '—'} · {entry.xp} XP</p>
        <p className="lb-card-meta">{entry.attemptCount != null ? `${entry.attemptCount}회 도전` : '도전 횟수 미집계'}</p>
      </div>
      <div
        className="lb-podium-base"
        aria-hidden
      />
    </div>
  );
}

function ListRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <tr>
      <td className="lb-col-rank">{entry.rank}</td>
      <td className="lb-col-name">{entry.maskedName}</td>
      <td className="lb-col-sn">{entry.maskedStudentNumber}</td>
      <td className="lb-col-score"><strong>{entry.score ?? 0}</strong>점</td>
      <td className="lb-col-grade" style={{ color: GRADE_COLOR[entry.grade ?? ''] }}>{entry.grade ?? '—'}</td>
      <td className="lb-col-combo">{entry.maxCombo}콤보</td>
      <td className="lb-col-count">{entry.attemptCount != null ? `${entry.attemptCount}회` : '—'}</td>
    </tr>
  );
}

export function LeaderboardScreen() {
  const [showAll, setShowAll] = useState(false);
  const { entries, stats, meta, loading, error, refresh } = useLeaderboard({
    limit: 100,
    autoRefresh: true,
    eventId: showAll ? 'all' : undefined,
  });

  const top3 = entries.filter((e) => e.rank <= 3);
  const rest = entries.filter((e) => e.rank > 3);

  const eventLabel = showAll
    ? '전체 기간'
    : meta.eventName
    ? meta.eventName
    : '전체 기간';

  return (
    <main className="lb-root" aria-label="CPR 실습 랭킹">
      <header className="lb-header">
        <div className="lb-brand">
          <HeartPulse size={28} aria-hidden />
          <div>
            <h1>LifePulse 랭킹</h1>
            <p>
              {eventLabel}
              {!showAll && meta.eventActive && (
                <span className="lb-event-badge lb-event-active">진행 중</span>
              )}
              {!showAll && !meta.eventActive && meta.eventName && (
                <span className="lb-event-badge lb-event-ended">종료됨</span>
              )}
            </p>
          </div>
        </div>
        <div className="lb-header-actions">
          <button
            className="lb-refresh"
            onClick={() => setShowAll((v) => !v)}
            aria-pressed={showAll}
          >
            {showAll ? '현재 이벤트만' : '전체 기간 보기'}
          </button>
          <button
            className="lb-refresh"
            onClick={refresh}
            disabled={loading}
            aria-label="랭킹 새로고침"
          >
            <RefreshCw size={16} aria-hidden />
            {loading ? '업데이트 중…' : '새로고침'}
          </button>
        </div>
      </header>

      <div className="lb-stats" aria-label="전체 통계">
        <div><strong>{stats.todayParticipants}</strong><span>오늘 참가자</span></div>
        <div><strong>{stats.totalAttempts}</strong><span>총 도전 횟수</span></div>
      </div>

      {error && (
        <p className="lb-error" role="alert">랭킹을 불러오지 못했습니다: {error}</p>
      )}

      {top3.length > 0 && (
        <section className="lb-podium" aria-labelledby="lb-podium-heading">
          <h2 id="lb-podium-heading" className="lb-section-title"><Trophy size={22} aria-hidden /> 명예의 TOP 3 <span>최고의 실습 기록을 만나보세요</span></h2>
          <div className="lb-podium-stage">
            {/* Render 2nd, 1st, 3rd for visual podium layout */}
            {[top3.find(e=>e.rank===2), top3.find(e=>e.rank===1), top3.find(e=>e.rank===3)].map((e) =>
              e ? <PodiumCard key={e.rank} entry={e} /> : null
            )}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section className="lb-list" aria-labelledby="lb-list-heading">
          <h2 id="lb-list-heading" className="lb-section-title">도전자 순위 <span>4위부터의 실습 기록</span></h2>
          <div className="lb-table-wrapper" role="region" aria-label="도전자 순위표 · 가로로 스크롤할 수 있습니다" tabIndex={0}>
            <table className="lb-table">
              <thead>
                <tr>
                  <th scope="col">순위</th>
                  <th scope="col">이름</th>
                  <th scope="col">학번</th>
                  <th scope="col">점수</th>
                  <th scope="col">등급</th>
                  <th scope="col">최대 콤보</th>
                  <th scope="col">도전</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((e) => <ListRow key={e.rank} entry={e} />)}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && entries.length === 0 && !error && (
        <p className="lb-empty">아직 기록이 없습니다. 실습 후 다시 확인해주세요.</p>
      )}

      <footer className="lb-footer">
        공개 랭킹에서는 이름과 학번이 마스킹 처리됩니다 · 교육용 프로토타입
      </footer>
    </main>
  );
}
