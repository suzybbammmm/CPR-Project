import React from 'react';
import { Clock3Icon, HeartPulseIcon, TimerIcon } from 'lucide-react';
import { DataPoint } from '../types/game.types';

type FeedbackTone = 'good' | 'caution' | 'urgent';

interface LivePracticeMonitorProps {
  victimLabel: string;
  targetDepth: string;
  handPlacement: string;
  depth: number;
  bpm: number;
  feedback: string;
  feedbackTone: FeedbackTone;
  compressionCount: number;
  properPercent: number;
  averageDepth: number;
  averageBpm: number;
  score: number;
  combo: number;
  secondsRemaining: number;
  playerLabel: string;
  rotationMessage: string;
  history: DataPoint[];
  onFinish: () => void;
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${Math.max(0, seconds % 60).toString().padStart(2, '0')}`;
}

function TrendChart({ title, unit, valueKey, history, range, target, color }: {
  title: string;
  unit: string;
  valueKey: 'depth' | 'bpm';
  history: DataPoint[];
  range: [number, number];
  target: [number, number];
  color: string;
}) {
  const points = history.slice(-60);
  const width = 560;
  const height = 220;
  const padding = 26;
  const [min, max] = range;
  const toY = (value: number) => height - padding - ((value - min) / (max - min)) * (height - padding * 2);
  const toX = (index: number) => padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(point[valueKey])}`).join(' ');
  const latest = points.at(-1)?.[valueKey] ?? 0;

  return (
    <section className="rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><h3 className="text-xl font-black text-white">{title}</h3><p className="mt-1 text-sm text-slate-400">최근 12초 · 초록 영역은 권장 범위</p></div>
        <div className="text-right"><strong className="text-3xl font-black" style={{ color }}>{latest.toFixed(valueKey === 'depth' ? 1 : 0)}</strong><span className="ml-1 text-sm text-slate-400">{unit}</span></div>
      </div>
      <svg className="h-56 w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} 그래프`}>
        <rect x={padding} y={toY(target[1])} width={width - padding * 2} height={toY(target[0]) - toY(target[1])} fill="#10b981" opacity="0.18" rx="8" />
        {[0.25, 0.5, 0.75].map((ratio) => <line key={ratio} x1={padding} x2={width - padding} y1={padding + (height - padding * 2) * ratio} y2={padding + (height - padding * 2) * ratio} stroke="#334155" strokeDasharray="5 5" />)}
        <text x={padding} y={toY(target[1]) - 8} fill="#6ee7b7" fontSize="13">권장 상한 {target[1]}{unit}</text>
        <text x={padding} y={toY(target[0]) + 18} fill="#6ee7b7" fontSize="13">권장 하한 {target[0]}{unit}</text>
        {path && <path d={path} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    </section>
  );
}

function PracticeMetric({ label, value, unit, accent }: { label: string; value: string; unit: string; accent: string }) {
  return <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5"><p className="text-sm font-bold text-slate-400">{label}</p><p className="mt-2 text-3xl font-black text-white"><span style={{ color: accent }}>{value}</span><span className="ml-1 text-base font-bold text-slate-400">{unit}</span></p></div>;
}

export function LivePracticeMonitor(props: LivePracticeMonitorProps) {
  const tone = props.feedbackTone === 'good'
    ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-100'
    : props.feedbackTone === 'urgent'
      ? 'border-red-400/50 bg-red-400/10 text-red-100'
      : 'border-amber-400/50 bg-amber-400/10 text-amber-100';

  return (
    <main className="min-h-screen bg-[#07111f] px-6 py-6 text-white lg:px-10">
      <div className="mx-auto max-w-[1680px]">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-700 pb-5">
          <div><p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-cyan-300"><HeartPulseIcon className="h-5 w-5" />LifePulse</p><h1 className="mt-1 text-3xl font-black">실시간 CPR 실습 모니터</h1><p className="mt-1 text-base text-slate-400">{props.playerLabel} · {props.victimLabel} · {props.handPlacement}</p></div>
          <div className="flex flex-wrap items-center gap-3"><div className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3"><p className="text-xs font-bold text-slate-400">목표 깊이</p><p className="mt-1 text-xl font-black text-emerald-300">{props.targetDepth}</p></div><div className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3"><p className="text-xs font-bold text-slate-400">남은 실습 시간</p><p className="mt-1 flex items-center gap-2 text-2xl font-black"><TimerIcon className="h-5 w-5 text-cyan-300" />{formatTime(props.secondsRemaining)}</p></div></div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <section className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-cyan-400/35 bg-cyan-400/10 p-6"><p className="text-base font-bold text-cyan-100">현재 압박 깊이</p><p className="mt-3 text-7xl font-black tabular-nums text-cyan-300">{props.depth.toFixed(1)}<span className="ml-2 text-2xl">cm</span></p><p className="mt-3 text-sm text-slate-300">권장 {props.targetDepth}</p></div>
              <div className="rounded-3xl border border-emerald-400/35 bg-emerald-400/10 p-6"><p className="text-base font-bold text-emerald-100">현재 압박 속도</p><p className="mt-3 text-7xl font-black tabular-nums text-emerald-300">{props.bpm}<span className="ml-2 text-2xl">회/분</span></p><p className="mt-3 text-sm text-slate-300">권장 100–120회/분</p></div>
            </div>

            <div className={`rounded-3xl border-2 p-6 ${tone}`}><p className="text-sm font-black uppercase tracking-[0.18em] opacity-75">지금 할 일</p><p className="mt-2 text-3xl font-black leading-tight">{props.feedback}</p></div>

            <div className="grid grid-cols-2 gap-4"><PracticeMetric label="누적 압박" value={props.compressionCount.toString()} unit="회" accent="#fbbf24" /><PracticeMetric label="적정 압박 비율" value={props.properPercent.toString()} unit="%" accent="#34d399" /><PracticeMetric label="평균 깊이" value={props.averageDepth.toFixed(1)} unit="cm" accent="#67e8f9" /><PracticeMetric label="평균 속도" value={props.averageBpm.toString()} unit="회/분" accent="#a7f3d0" /></div>
          </section>

          <section className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2"><TrendChart title="압박 깊이 변화" unit="cm" valueKey="depth" history={props.history} range={[0, 8]} target={[5, 6]} color="#22d3ee" /><TrendChart title="압박 속도 변화" unit="회/분" valueKey="bpm" history={props.history} range={[60, 150]} target={[100, 120]} color="#34d399" /></div>
            <div className="grid gap-4 sm:grid-cols-3"><PracticeMetric label="교대 상태" value={props.rotationMessage} unit="" accent="#f8fafc" /><PracticeMetric label="실습 점수" value={props.score.toString()} unit="점" accent="#fbbf24" /><PracticeMetric label="연속 정확 압박" value={props.combo.toString()} unit="콤보" accent="#c084fc" /></div>
            <button onClick={props.onFinish} className="rounded-2xl border border-slate-600 bg-slate-800 px-5 py-3 text-base font-black text-white transition hover:border-cyan-300 hover:bg-slate-700">실습 종료 및 결과 보기</button>
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 text-base text-slate-300"><p className="flex items-center gap-2 font-black text-white"><Clock3Icon className="h-5 w-5 text-cyan-300" />실습 안내</p><p className="mt-2">그래프의 초록 영역을 유지하고, 교대가 필요할 때는 CPR 중단을 10초 이내로 제한하세요.</p></div>
          </section>
        </div>
      </div>
    </main>
  );
}
