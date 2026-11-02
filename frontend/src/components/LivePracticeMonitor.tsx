import React from 'react';
import { FlameIcon, HeartPulseIcon, ShieldCheckIcon, SparklesIcon, StarIcon, TargetIcon, TimerIcon, TrophyIcon } from 'lucide-react';
import { DataPoint } from '../types/game.types';
import type { LiveCoachFeedback } from '../utils/cprCoach';

type FeedbackTone = 'good' | 'caution' | 'urgent';
interface LivePracticeMonitorProps { victimLabel: string; targetDepth: string; handPlacement: string; depth: number; bpm: number; recoil?: number | null; feedback: string; feedbackTone: FeedbackTone; coach: LiveCoachFeedback; compressionCount: number; properPercent: number; averageDepth: number; averageBpm: number; score: number; combo: number; secondsRemaining: number; playerLabel: string; rotationMessage: string; history: DataPoint[]; onFinish: () => void; }

function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${Math.max(0, seconds % 60).toString().padStart(2, '0')}`; }

function TrendChart({ title, unit, valueKey, history, range, target, color }: { title: string; unit: string; valueKey: 'depth' | 'bpm'; history: DataPoint[]; range: [number, number]; target: [number, number]; color: string; }) {
  const points = history.slice(-60), width = 560, height = 220, padding = 26;
  const [min, max] = range;
  const toY = (value: number) => height - padding - ((value - min) / (max - min)) * (height - padding * 2);
  const toX = (index: number) => padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
  const coordinates = points.map((point, index) => ({ x: toX(index), y: toY(point[valueKey]) }));
  const path = coordinates.reduce((result, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = coordinates[index - 1], controlX = previous.x + (point.x - previous.x) / 2;
    return `${result} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, '');
  const latest = points.at(-1)?.[valueKey] ?? 0;
  return <section className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl backdrop-blur-xl">
    <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-xl font-black">{title}</h3><p className="mt-1 text-sm text-slate-400">최근 12초 · 초록 영역은 권장 범위</p></div><div><strong className="text-3xl font-black tabular-nums" style={{ color }}>{latest.toFixed(valueKey === 'depth' ? 1 : 0)}</strong><span className="ml-1 text-sm text-slate-400">{unit}</span></div></div>
    <svg className="h-56 w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} graph`} data-chart-style="smooth">
      <defs><filter id={`glow-${valueKey}`}><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <rect x={padding} y={toY(target[1])} width={width-padding*2} height={toY(target[0])-toY(target[1])} fill="#10b981" opacity=".18" rx="10"/>
      {[.25,.5,.75].map(r => <line key={r} x1={padding} x2={width-padding} y1={padding+(height-padding*2)*r} y2={padding+(height-padding*2)*r} stroke="#334155" strokeDasharray="5 7"/>)}
      <text x={padding} y={toY(target[1])-8} fill="#6ee7b7" fontSize="13">권장 상한 {target[1]}{unit}</text><text x={padding} y={toY(target[0])+18} fill="#6ee7b7" fontSize="13">권장 하한 {target[0]}{unit}</text>
      {path && <path className="live-chart-line" d={path} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" filter={`url(#glow-${valueKey})`}/>}
    </svg>
  </section>;
}

function Metric({ label, value, unit, accent }: { label: string; value: string; unit: string; accent: string }) { return <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-5 backdrop-blur-xl"><p className="text-sm font-bold text-slate-400">{label}</p><p className="mt-2 text-3xl font-black"><span className="tabular-nums" style={{color:accent}}>{value}</span><span className="ml-1 text-base text-slate-400">{unit}</span></p></div>; }

export function LivePracticeMonitor(p: LivePracticeMonitorProps) {
  const tone = p.feedbackTone === 'good' ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-100' : p.feedbackTone === 'urgent' ? 'border-red-400/50 bg-red-400/10 text-red-100' : 'border-amber-400/50 bg-amber-400/10 text-amber-100';
  const level = Math.min(5, Math.floor(p.score/20)+1), levelProgress = (p.score%20)*10, missionProgress = Math.min(100, Math.round(p.compressionCount/60*100));
  return <main className="practice-arena relative min-h-screen overflow-hidden bg-[#06101e] px-6 py-6 text-white lg:px-10">
    <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl"/><div className="pointer-events-none absolute right-0 top-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl"/>
    <div className="relative mx-auto max-w-[1680px]">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5"><div><p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[.2em] text-cyan-300"><HeartPulseIcon className="h-5 w-5"/>LifePulse Arena</p><h1 className="mt-1 text-3xl font-black">실시간 CPR 실습 모니터</h1><p className="mt-1 text-slate-400">{p.playerLabel} · {p.victimLabel} · {p.handPlacement}</p></div>
        <div className="flex flex-wrap gap-3"><div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 px-5 py-3"><p className="flex items-center gap-1 text-xs font-black text-amber-200"><TrophyIcon className="h-4 w-4"/>레벨 {level}</p><div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400 transition-all duration-500" style={{width:`${levelProgress/2}%`}}/></div></div><div className="rounded-2xl border border-white/10 bg-slate-900/75 px-5 py-3"><p className="text-xs text-slate-400">목표 깊이</p><p className="mt-1 text-xl font-black text-emerald-300">{p.targetDepth}</p></div><div className="rounded-2xl border border-white/10 bg-slate-900/75 px-5 py-3"><p className="text-xs text-slate-400">남은 실습 시간</p><p className="mt-1 flex items-center gap-2 text-2xl font-black tabular-nums"><TimerIcon className="h-5 w-5 text-cyan-300"/>{formatTime(p.secondsRemaining)}</p></div></div>
      </header>
      <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <section className="space-y-5">
          <div className="rounded-[2rem] border border-violet-400/25 bg-gradient-to-r from-violet-500/15 via-cyan-500/10 to-emerald-500/15 p-5"><div className="flex items-center justify-between"><div><p className="flex items-center gap-2 text-sm font-black tracking-[.16em] text-violet-200"><TargetIcon className="h-5 w-5"/>오늘의 미션</p><p className="mt-2 text-xl font-black">60회 안정하게 완료하기</p></div><strong className="text-2xl text-cyan-200">{p.compressionCount}/60</strong></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-950/70"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-cyan-400 to-emerald-400 transition-all duration-500" style={{width:`${missionProgress}%`}}/></div></div>
          <div className="grid grid-cols-2 gap-4"><div className="rounded-[2rem] border border-cyan-400/35 bg-cyan-400/10 p-6"><p className="font-bold text-cyan-100">직전 압박 최고 깊이</p><p className="mt-3 text-7xl font-black tabular-nums text-cyan-300">{p.depth.toFixed(1)}<span className="ml-2 text-2xl">cm</span></p><p className="mt-3 text-sm text-slate-300">권장 {p.targetDepth}</p></div><div className="rounded-[2rem] border border-emerald-400/35 bg-emerald-400/10 p-6"><p className="font-bold text-emerald-100">현재 압박 속도</p><p className="mt-3 text-7xl font-black tabular-nums text-emerald-300">{p.bpm}<span className="ml-2 text-2xl">회/분</span></p><p className="mt-3 text-sm text-slate-300">권장 100–120회/분</p></div></div>
          <div className={`relative overflow-hidden rounded-3xl border-2 p-6 ${tone}`}><SparklesIcon className="absolute right-5 top-5 h-8 w-8 opacity-40"/><p className="text-sm font-black tracking-[.18em] opacity-75">AI CPR 코치 · {p.coach.title}</p><p className="mt-2 text-3xl font-black">{p.coach.action}</p><p className="mt-3 max-w-xl text-sm font-medium opacity-90">{p.coach.rationale}</p><p className="mt-2 text-xs opacity-70">기준: {p.coach.criterion}</p><p className="mt-2 text-xs opacity-70">복귀율은 변위 기준 · 손 압력·손 위치·환기 품질 미측정</p></div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-5"><Metric label="이완 복귀율" value={p.recoil == null ? '—' : p.recoil.toFixed(1)} unit={p.recoil == null ? '' : '%'} accent="#c4b5fd"/><p className="mt-2 text-xs text-slate-400">{p.recoil == null ? '측정 대기' : '직전 압박의 변위 복귀'} · 완전 이완 판정 및 적정 압박 비율과 구분합니다.</p></div><div className="grid grid-cols-2 gap-4"><Metric label="누적 압박" value={`${p.compressionCount}`} unit="회" accent="#fbbf24"/><Metric label="적정 압박 비율" value={`${p.properPercent}`} unit="%" accent="#34d399"/><Metric label="평군 깊이" value={p.averageDepth.toFixed(1)} unit="cm" accent="#67e8f9"/><Metric label="평군 속도" value={`${p.averageBpm}`} unit="회/분" accent="#a7f3d0"/></div>
        </section>
        <section className="space-y-5"><div className="grid gap-5 lg:grid-cols-2"><TrendChart title="압박별 최고값" unit="cm" valueKey="depth" history={p.history} range={[0,8]} target={[5,6]} color="#22d3ee"/><TrendChart title="압박 속도 변화" unit="회/분" valueKey="bpm" history={p.history} range={[60,150]} target={[100,120]} color="#34d399"/></div>
          <div className="grid gap-4 sm:grid-cols-3"><Metric label="교대 상태" value={p.rotationMessage} unit="" accent="#f8fafc"/><div className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-5"><p className="flex gap-2 text-sm font-bold text-amber-100"><StarIcon className="h-5 w-5 fill-amber-300"/>실습 XP</p><p className="mt-2 text-3xl font-black text-amber-300">{p.score}<span className="ml-1 text-base text-slate-400">점</span></p></div><div className="rounded-2xl border border-violet-300/25 bg-violet-400/10 p-5"><p className="flex gap-2 text-sm font-bold text-violet-100"><FlameIcon className="h-5 w-5 fill-violet-400"/>연속 정확 압박</p><p className="mt-2 text-3xl font-black text-violet-300">{p.combo}<span className="ml-1 text-base text-slate-400">콤보</span></p></div></div>
          <button onClick={p.onFinish} className="rounded-2xl border border-slate-600 bg-slate-800 px-5 py-3 font-black transition hover:border-cyan-300 hover:bg-slate-700">실습 종료 및 결과 보기</button>
          <div className="rounded-2xl border border-violet-300/20 bg-gradient-to-br from-violet-500/10 to-slate-900/80 p-5"><p className="flex items-center gap-2 font-black text-white"><TargetIcon className="h-5 w-5 text-violet-300"/>점수 · 콤보 기준 <span className="ml-auto rounded-full bg-amber-300/15 px-3 py-1 text-xs text-amber-200">최대 100점</span></p><div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2"><div className="rounded-xl bg-slate-950/40 p-3"><strong className="text-emerald-300">정확 압박 +2점</strong><p className="mt-1">깊이 목표 범위 + 100–120회/분</p></div><div className="rounded-xl bg-slate-950/40 p-3"><strong className="text-cyan-300">근접 압박 +1점</strong><p className="mt-1">깊이 ±1cm, 속도 85–135회/분</p></div><div className="rounded-xl bg-slate-950/40 p-3 sm:col-span-2"><strong className="text-violet-300">콤보</strong><p className="mt-1">정확 압박이 연속될 때 +1 · 기준 범위를 벗어나면 콤보 초기화</p></div></div></div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-5 text-slate-300"><p className="flex gap-2 font-black text-white"><ShieldCheckIcon className="h-5 w-5 text-cyan-300"/>실습 안내</p><p className="mt-2">초록 영역을 유지하고, 교대 시 CPR 중단을 10초 이내로 제한하세요.</p></div>
        </section>
      </div>
    </div>
  </main>;
}
