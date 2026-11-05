import { useCallback, useEffect, useRef, useState } from 'react';
import '../admin.css';
import { Download, HeartPulse, RefreshCw } from 'lucide-react';
import { getAdminAttempts, getExportCsvUrl } from '../api/admin';
import { AdminAttemptsTable } from '../components/AdminAttemptsTable';
import type { AdminAttempt } from '../api/admin';

export function AdminScreen() {
  const [attempts, setAttempts] = useState<AdminAttempt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const requestVersion = useRef({ value: 0 });

  const loadAttempts = useCallback(async () => {
    const version = ++requestVersion.current.value;
    setLoading(true);
    setLoadError('');
    try {
      const data = await getAdminAttempts({ page, perPage: 50, search: search || undefined });
      if (version !== requestVersion.current.value) return;
      setAttempts(data.attempts);
      setTotal(data.total);
    } catch {
      if (version !== requestVersion.current.value) return;
      setLoadError('참가자 정보를 불러오지 못했습니다. 백엔드 서버 연결을 확인하고 다시 시도해주세요.');
    } finally {
      if (version === requestVersion.current.value) setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadAttempts();
    const requests = requestVersion.current;
    return () => { requests.value++; };
  }, [loadAttempts]);

  const totalPages = Math.ceil(total / 50);

  return (
    <main className="adm-root" aria-label="관리자 대시보드">
      <header className="adm-header">
        <span className="adm-brand"><HeartPulse size={22} aria-hidden /> LifePulse 참가자 정보</span>
        <div className="adm-header-actions">
          <button className="adm-action" onClick={loadAttempts}>
            <RefreshCw size={15} aria-hidden /> 새로고침
          </button>
          <a className="adm-action" href={getExportCsvUrl()} download>
            <Download size={15} aria-hidden /> 참가자 CSV 내보내기
          </a>
        </div>
      </header>

      <section className="adm-section" aria-labelledby="attempts-heading">
        <h2 id="attempts-heading">참가자 정보 ({total}건)</h2>
        <p className="adm-contact-note">실습 종료 후 저장된 기록입니다. 같은 참가자의 재도전은 각각 표시되며, 미입력 기록은 연락처가 없습니다.</p>
        <div className="adm-search">
          <input
            type="search"
            placeholder="이름 · 학번 · 전화번호 검색"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            aria-label="참가자 검색"
          />
        </div>
        {loadError && <p className="adm-error" role="alert">{loadError}</p>}
        {loading ? (
          <p>불러오는 중…</p>
        ) : !loadError ? (
          <AdminAttemptsTable attempts={attempts} />
        ) : null}
        {totalPages > 1 && (
          <div className="adm-pagination" aria-label="페이지 탐색">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</button>
            <span>{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>다음</button>
          </div>
        )}
      </section>

      <footer className="adm-footer">LifePulse 참가자 관리</footer>
    </main>
  );
}
