import type { AdminAttempt } from '../api/admin';

function formatContactPhone(value: string | null): string {
  if (!value) return '미입력';
  const digits = value.replace(/[-\s]/g, '');
  return /^01[0-9]\d{7,8}$/.test(digits) ? `${digits.slice(0,3)}-${digits.slice(3,-4)}-${digits.slice(-4)}` : value;
}

export function AdminAttemptsTable({ attempts }: {
  attempts: AdminAttempt[];
}) {
  return (
    <div className="adm-table-wrapper">
      <table className="adm-table" aria-label="참가자 정보 및 실습 기록">
        <thead>
          <tr>
            <th>학번</th><th>이름</th><th>전화번호</th><th>점수</th><th>등급</th>
            <th>압박</th><th>평균깊이</th><th>완료일시</th>
          </tr>
        </thead>
        <tbody>
          {attempts.length === 0 && <tr><td colSpan={8} className="adm-empty">표시할 참가자 기록이 없습니다.</td></tr>}
          {attempts.map((a) => (
            <tr key={a.id}>
              <td>{a.studentNumber}</td>
              <td>{a.name}</td>
              <td className="adm-phone">{formatContactPhone(a.phone)}</td>
              <td>{a.score ?? '—'}</td>
              <td>{a.grade ?? '—'}</td>
              <td>{a.compressionCount}</td>
              <td>{a.averageDepth?.toFixed(1) ?? '—'}</td>
              <td>{a.completedAt.slice(0, 16).replace('T', ' ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

