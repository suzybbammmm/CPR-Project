import React, { useEffect, useState } from 'react';
import '../admin.css';
import { AlertCircle, CheckCircle, Download, HeartPulse, LogOut, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import {
  adminLogin, adminLogout, getAdminStats, getAdminAttempts,
  invalidateAttempt, restoreAttempt, createEvent, finalizeEvent,
  getExportCsvUrl, getBackupUrl,
} from '../api/admin';
import type { AdminStats, AdminAttempt } from '../api/admin';
import { ApiError } from '../api/client';

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await adminLogin(password);
      onLogin();
    } catch (err) {
      setError('로그인 실패. 비밀번호를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="adm-login">
      <div className="adm-login-card">
        <span className="adm-brand"><HeartPulse size={28} aria-hidden /> LifePulse 관리자</span>
        <form onSubmit={submit} noValidate aria-label="관리자 로그인">
          <div className="adm-field">
            <label htmlFor="admin-pw">관리자 비밀번호</label>
            <input
              id="admin-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="adm-error" role="alert">{error}</p>}
          <button className="adm-primary" type="submit" disabled={loading || !password}>
            {loading ? '로그인 중…' : '로그인'}
          </button>
        </form>
      </div>
    </main>
  );
}

function StatsPanel({ stats }: { stats: AdminStats }) {
  return (
    <div className="adm-stats-grid">
      <div className="adm-stat">
        {stats.sensorConnected ? <Wifi size={20} className="adm-icon-ok" /> : <WifiOff size={20} className="adm-icon-warn" />}
        <span>센서 상태</span>
        <strong>{stats.sensorConnected ? '연결됨' : '미연결'}</strong>
      </div>
      <div className="adm-stat">
        <CheckCircle size={20} aria-hidden />
        <span>오늘 참가자</span>
        <strong>{stats.stats.todayParticipants}명</strong>
      </div>
      <div className="adm-stat">
        <CheckCircle size={20} aria-hidden />
        <span>총 도전 횟수</span>
        <strong>{stats.stats.totalAttempts}회</strong>
      </div>
      <div className="adm-stat">
        <span>활성 이벤트</span>
        <strong>{stats.activeEvent?.name ?? '없음'}</strong>
      </div>
    </div>
  );
}

function AttemptsTable({ attempts, onInvalidate, onRestore }: {
  attempts: AdminAttempt[];
  onInvalidate: (id: number, reason: string) => void;
  onRestore: (id: number) => void;
}) {
  return (
    <div className="adm-table-wrapper">
      <table className="adm-table" aria-label="참가자 시도 목록">
        <thead>
          <tr>
            <th>학번</th><th>이름</th><th>점수</th><th>등급</th>
            <th>압박</th><th>평균깊이</th><th>완료일시</th><th>상태</th><th>조치</th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((a) => (
            <tr key={a.id} className={a.invalidatedAt ? 'adm-row-invalid' : ''}>
              <td>{a.studentNumber}</td>
              <td>{a.name}</td>
              <td>{a.score ?? '—'}</td>
              <td>{a.grade ?? '—'}</td>
              <td>{a.compressionCount}</td>
              <td>{a.averageDepth?.toFixed(1) ?? '—'}</td>
              <td>{a.completedAt.slice(0, 16).replace('T', ' ')}</td>
              <td>{a.invalidatedAt ? <span className="adm-badge-invalid">무효</span> : <span className="adm-badge-valid">유효</span>}</td>
              <td>
                {a.invalidatedAt
                  ? <button className="adm-action" onClick={() => onRestore(a.id)}>복원</button>
                  : <button className="adm-action adm-action-warn" onClick={() => {
                      const reason = window.prompt('무효 처리 사유를 입력하세요:');
                      if (reason?.trim()) onInvalidate(a.id, reason.trim());
                    }}>무효 처리</button>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminScreen() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [attempts, setAttempts] = useState<AdminAttempt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [newEventName, setNewEventName] = useState('');

  const loadStats = async () => {
    try {
      setStats(await getAdminStats());
    } catch { /* session may have expired */ }
  };

  const loadAttempts = async () => {
    setLoading(true);
    try {
      const data = await getAdminAttempts({ page, perPage: 50, search: search || undefined });
      setAttempts(data.attempts);
      setTotal(data.total);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loggedIn) return;
    loadStats();
    loadAttempts();
  }, [loggedIn, page, search]);

  if (!loggedIn) return <LoginForm onLogin={() => setLoggedIn(true)} />;

  const handleLogout = async () => {
    await adminLogout().catch(() => {});
    setLoggedIn(false);
  };

  const handleInvalidate = async (id: number, reason: string) => {
    await invalidateAttempt(id, reason);
    loadAttempts();
  };

  const handleRestore = async (id: number) => {
    await restoreAttempt(id);
    loadAttempts();
  };

  const handleCreateEvent = async () => {
    if (!newEventName.trim()) return;
    await createEvent({ name: newEventName.trim() });
    setNewEventName('');
    loadStats();
  };

  const totalPages = Math.ceil(total / 50);

  return (
    <main className="adm-root" aria-label="관리자 대시보드">
      <header className="adm-header">
        <span className="adm-brand"><HeartPulse size={22} aria-hidden /> LifePulse 관리자</span>
        <div className="adm-header-actions">
          <button className="adm-action" onClick={() => { loadStats(); loadAttempts(); }}>
            <RefreshCw size={15} aria-hidden /> 새로고침
          </button>
          <a className="adm-action" href={getExportCsvUrl()} download>
            <Download size={15} aria-hidden /> CSV 내보내기
          </a>
          <a className="adm-action" href={getBackupUrl()} download>
            <Download size={15} aria-hidden /> DB 백업
          </a>
          <button className="adm-action adm-action-warn" onClick={handleLogout}>
            <LogOut size={15} aria-hidden /> 로그아웃
          </button>
        </div>
      </header>

      {stats && (
        <section className="adm-section" aria-labelledby="stats-heading">
          <h2 id="stats-heading">운영 현황</h2>
          {!stats.sensorConnected && (
            <div className="adm-alert" role="alert">
              <AlertCircle size={18} aria-hidden /> 센서가 연결되지 않았습니다.
            </div>
          )}
          <StatsPanel stats={stats} />
        </section>
      )}

      <section className="adm-section" aria-labelledby="event-heading">
        <h2 id="event-heading">이벤트 관리</h2>
        <div className="adm-event-form">
          <input
            type="text"
            placeholder="새 이벤트 이름"
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            aria-label="새 이벤트 이름"
          />
          <button className="adm-primary" onClick={handleCreateEvent} disabled={!newEventName.trim()}>
            이벤트 생성
          </button>
          {stats?.activeEvent && (
            <button
              className="adm-action adm-action-warn"
              onClick={() => {
                if (window.confirm(`이벤트 "${stats.activeEvent?.name}"를 종료하시겠습니까?`)) {
                  finalizeEvent(stats.activeEvent!.id).then(loadStats);
                }
              }}
            >
              현재 이벤트 종료
            </button>
          )}
        </div>
      </section>

      <section className="adm-section" aria-labelledby="attempts-heading">
        <h2 id="attempts-heading">전체 기록 ({total}건)</h2>
        <div className="adm-search">
          <input
            type="search"
            placeholder="학번 또는 이름 검색"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            aria-label="참가자 검색"
          />
        </div>
        {loading ? (
          <p>불러오는 중…</p>
        ) : (
          <AttemptsTable attempts={attempts} onInvalidate={handleInvalidate} onRestore={handleRestore} />
        )}
        {totalPages > 1 && (
          <div className="adm-pagination" aria-label="페이지 탐색">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</button>
            <span>{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>다음</button>
          </div>
        )}
      </section>

      <footer className="adm-footer">
        DB: {stats?.stats.dbPath ?? '—'} · 교육용 프로토타입
      </footer>
    </main>
  );
}
