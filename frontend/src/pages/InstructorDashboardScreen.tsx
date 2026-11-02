import React from 'react';
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArrowDownToLineIcon,
  BellIcon,
  CheckCircle2Icon,
  GaugeIcon,
  HeartPulseIcon,
  MapPinIcon,
  RefreshCwIcon,
  StethoscopeIcon,
  UsersIcon,
  ZapIcon
} from 'lucide-react';
import { ModeBadge } from '../components/showcase/ModeBadge';
import { RuntimeMode } from '../config/runtime';
import { DemoLearner, DemoSession, MonitoringStatus } from '../demo/scenario';
import { LiveCoachFeedback } from '../utils/cprCoach';

interface InstructorDashboardScreenProps {
  mode: RuntimeMode;
  session: DemoSession;
  selectedLearnerId: string;
  onSelectLearner: (learnerId: string) => void;
  connected?: boolean;
  coach?: LiveCoachFeedback;
}

const STATUS_META: Record<MonitoringStatus, { label: string; dot: string; card: string; text: string }> = {
  normal: { label: '정상', dot: 'bg-teal-500', card: 'border-slate-200 bg-white', text: 'text-teal-700' },
  caution: { label: '주의', dot: 'bg-amber-500', card: 'border-amber-200 bg-amber-50/60', text: 'text-amber-700' },
  urgent: { label: '긴급', dot: 'bg-red-500', card: 'border-red-300 bg-red-50', text: 'text-red-700' }
};

function ScoreRing({ learner }: { learner: DemoLearner }) {
  const color = learner.status === 'urgent' ? '#ef4444' : learner.status === 'caution' ? '#f59e0b' : '#0d9488';
  return (
    <div className="relative flex h-14 w-14 items-center justify-center rounded-full" style={{ background: `conic-gradient(${color} ${learner.metrics.score * 3.6}deg, #e2e8f0 0deg)` }}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-black text-slate-800">{learner.metrics.score}</div>
    </div>
  );
}

function LearnerCard({ learner, selected, onSelect, showRecoil }: { learner: DemoLearner; selected: boolean; onSelect: () => void; showRecoil: boolean }) {
  const recoil = showRecoil ? learner.metrics.recoil : null;
  const meta = STATUS_META[learner.status];
  return (
    <button onClick={onSelect} className={`rounded-2xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selected ? 'ring-2 ring-teal-500' : ''} ${meta.card}`} aria-label={`${learner.name} 상세 수행 지표 보기`}>
      <div className="mb-3 flex items-start justify-between">
        <div><p className="font-black text-slate-800">{learner.name}</p><p className="text-xs text-slate-400">{learner.station}</p></div>
        <span className={`flex items-center gap-1.5 text-xs font-bold ${meta.text}`}><span className={`h-2.5 w-2.5 rounded-full ${meta.dot} ${learner.status === 'urgent' ? 'animate-pulse' : ''}`} />{meta.label}</span>
      </div>
      <div className="flex items-center justify-between">
        <ScoreRing learner={learner} />
        <div className="space-y-1 text-right text-xs text-slate-500">
          <p><strong className="text-slate-700">{learner.metrics.depthMm.toFixed(1)}</strong> mm</p>
          <p><strong className="text-slate-700">{learner.metrics.rate}</strong> 회/분</p>
          <p><strong className="text-slate-700">{recoil ?? '—'}</strong>{recoil == null ? ' 측정 대기' : '% 이완 복귀율'}</p>
        </div>
      </div>
    </button>
  );
}

function DetailMetric({ icon, label, value, target, reference = false }: { icon: React.ReactNode; label: string; value: string; target: string; reference?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">{icon}{label}</div>
      <p className="text-2xl font-black tabular-nums text-slate-800">{value}</p>
      <p className="mt-1 text-[11px] text-slate-400">{reference ? target : `권장 ${target}`}</p>
    </div>
  );
}

export function InstructorDashboardScreen({ mode, session, selectedLearnerId, onSelectLearner, connected = true, coach }: InstructorDashboardScreenProps) {
  const selected = session.learners.find((learner) => learner.id === selectedLearnerId) ?? session.learners[0];
  const counts = session.learners.reduce((acc, learner) => ({ ...acc, [learner.status]: acc[learner.status] + 1 }), { normal: 0, caution: 0, urgent: 0 });

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-[#0f2540] px-5 py-3 text-white shadow-lg">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-teal-400/15 p-2 text-teal-300"><HeartPulseIcon className="h-7 w-7" /></span><div><h1 className="text-xl font-black">LifePulse</h1><p className="text-xs text-slate-300">CPR 실습 강사 관제 시스템</p></div></div>
          <ModeBadge mode={mode} connected={connected} />
          <div className="flex gap-5 text-center text-xs text-slate-300">
            <div><strong className="block text-xl text-white">{session.learners.length}</strong>실습 참여</div>
            <div><strong className="block text-xl text-teal-300">{counts.normal}</strong>정상 수행</div>
            <div><strong className="block text-xl text-red-300">{counts.urgent}</strong>긴급 알림</div>
          </div>
        </div>
      </header>

      {counts.urgent > 0 && (
        <div role="alert" className="bg-red-600 px-5 py-2.5 text-white">
          <div className="mx-auto flex max-w-[1600px] items-center gap-3 text-sm font-bold"><AlertTriangleIcon className="h-5 w-5 animate-pulse" />긴급 경고 · 현재 {counts.urgent}명의 학습자가 즉시 확인이 필요합니다.</div>
        </div>
      )}

      <div className="mx-auto max-w-[1600px] p-4">
        <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div><p className="text-xs font-bold uppercase tracking-wider text-teal-600">Current practicum</p><h2 className="text-lg font-black text-slate-800">{session.name}</h2></div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-500"><span className="flex items-center gap-1"><MapPinIcon className="h-4 w-4" />{session.location}</span><span className="flex items-center gap-1"><StethoscopeIcon className="h-4 w-4" />{session.instructor}</span><span className="flex items-center gap-1"><UsersIcon className="h-4 w-4" />{session.learners.length}명 동시 실습</span></div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h2 className="flex items-center gap-2 font-black text-slate-800"><ActivityIcon className="h-5 w-5 text-teal-600" />실시간 수행 현황 <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] text-teal-700">LIVE</span></h2>
                <div className="flex gap-2 text-xs font-bold"><span className="rounded-full bg-teal-50 px-2.5 py-1 text-teal-700">정상 {counts.normal}</span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">주의 {counts.caution}</span><span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">긴급 {counts.urgent}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{session.learners.map((learner) => <LearnerCard key={learner.id} learner={learner} selected={learner.id === selected.id} onSelect={() => onSelectLearner(learner.id)} showRecoil={mode !== 'live' || connected} />)}</div>
            </section>

            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-slate-800"><ActivityIcon className="h-4 w-4 text-teal-600" />실습실 평균 수행 점수</h2>
                <div className="flex h-40 items-end gap-3 border-b border-l border-slate-200 px-3 pt-4">{session.scoreHistory.map((point) => <div key={point.time} className="flex flex-1 flex-col items-center justify-end gap-1"><span className="text-[10px] font-bold text-teal-700">{point.score}</span><div className="w-full max-w-12 rounded-t bg-gradient-to-t from-teal-600 to-teal-300" style={{ height: `${point.score}%` }} /><span className="text-[10px] text-slate-400">{point.time}</span></div>)}</div>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800"><BellIcon className="h-4 w-4 text-teal-600" />최근 알림 로그</h2>
                <div className="max-h-40 space-y-2 overflow-y-auto">{session.alerts.length === 0 ? <p className="rounded-xl bg-teal-50 p-4 text-center text-sm text-teal-700">모든 학습자가 정상 범위입니다.</p> : session.alerts.map((alert) => <button key={alert.id} onClick={() => onSelectLearner(alert.learnerId)} className={`w-full rounded-xl border p-2 text-left text-xs ${alert.level === 'urgent' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}><span className="font-black">{alert.level === 'urgent' ? '긴급' : '주의'} · {alert.learnerName}</span><span className="float-right text-slate-400">{alert.time}</span><p className="mt-1 text-slate-600">{alert.message}</p></button>)}</div>
              </section>
            </div>
          </div>

          <aside className={`rounded-2xl border bg-white p-4 shadow-sm ${selected.status === 'urgent' ? 'border-red-300' : 'border-slate-200'}`}>
            <div className="mb-4 flex items-start justify-between border-b border-slate-100 pb-4">
              <div><p className="text-xs text-slate-400">선택 학습자</p><h2 className="text-xl font-black text-slate-800">{selected.name}</h2><p className="text-xs text-slate-500">{selected.station} · CPR 기본과정</p></div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-black ${selected.status === 'urgent' ? 'bg-red-100 text-red-700' : selected.status === 'caution' ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'}`}>{STATUS_META[selected.status].label}</span>
            </div>
            <div className={`mb-4 rounded-2xl p-5 text-white ${selected.status === 'urgent' ? 'bg-red-700' : 'bg-[#12294a]'}`}><p className="text-xs text-slate-200">실시간 종합 점수</p><div className="mt-1 flex items-end gap-1"><strong className="text-5xl tabular-nums">{selected.metrics.score}</strong><span className="mb-1 text-sm text-slate-300">/ 100</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-teal-300" style={{ width: `${selected.metrics.score}%` }} /></div></div>
            <h3 className="mb-2 text-sm font-black text-slate-700">핵심 수행 지표</h3>
            <div className="grid grid-cols-2 gap-3">
              <DetailMetric icon={<ArrowDownToLineIcon className="h-4 w-4" />} label="가슴 압박 깊이" value={`${selected.metrics.depthMm.toFixed(1)} mm`} target="50–60mm" />
              <DetailMetric icon={<GaugeIcon className="h-4 w-4" />} label="분당 압박 횟수" value={`${selected.metrics.rate}회`} target="100–120회" />
              <DetailMetric icon={<RefreshCwIcon className="h-4 w-4" />} label="이완 복귀율" value={(mode === 'live' && !connected) || selected.metrics.recoil == null ? '—' : `${selected.metrics.recoil}%`} target="변위 기준 참고값 · 직전 압박의 변위 복귀" reference />
              <DetailMetric icon={<ZapIcon className="h-4 w-4" />} label="AED 사용 여부" value={selected.metrics.aedUsed ? '사용함' : '미사용'} target="시나리오 단계 준수" />
            </div>
            {coach && <section className={`mt-4 rounded-xl border p-3 text-xs leading-5 ${coach.severity === 'good' ? 'border-teal-200 bg-teal-50 text-teal-800' : coach.severity === 'offline' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
              <p className="font-black">AI CPR 코치 · {coach.title}</p>
              <p className="mt-1 font-bold">{coach.action}</p>
              <p className="mt-1">{coach.rationale}</p>
              <p className="mt-1 text-[11px] opacity-80">판단 근거: {coach.criterion}</p>
              <p className="mt-1 text-[11px] opacity-80">복귀율은 변위 기준 · 손 압력·손 위치·환기 품질 미측정</p>
            </section>}
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500"><p className="mb-1 flex items-center gap-1 font-bold text-slate-700"><CheckCircle2Icon className="h-4 w-4 text-teal-600" />권장 범위 안내</p>{coach?.criterion ?? '깊이 50–60mm · 속도 100–120회/분'}<br />복귀율은 변위 기준 · 손 압력·손 위치·환기 품질 미측정</div>
          </aside>
        </div>
      </div>
    </main>
  );
}
