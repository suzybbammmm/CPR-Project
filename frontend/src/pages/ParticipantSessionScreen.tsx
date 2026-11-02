import React from 'react';
import { ActivityIcon, ArrowDownIcon, BookOpenIcon, ChevronRightIcon, Clock3Icon, GaugeIcon, HeartPulseIcon, PlayIcon, RotateCcwIcon, SparklesIcon, SquareIcon, TimerIcon, UsersIcon } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RuntimeMode } from '../config/runtime';
import { MonitoringStatus, ParticipantReading } from '../demo/scenario';
import { ModeBadge } from '../components/showcase/ModeBadge';
import { analyzeCprSession, LiveCoachFeedback } from '../utils/cprCoach';
import { CPR_PROFILES, VictimType } from '../utils/cprGuidance';
import { DataPoint } from '../types/game.types';

export type ParticipantDisplayReading = Omit<ParticipantReading, 'recoil'> & { recoil: number | null };
export type ParticipantChartPoint = { time: number; depth: number; bpm: number };
export const PARTICIPANT_CHART_DURATION_SECONDS = 120;

export function appendParticipantChartPoint(history: ParticipantChartPoint[], point: ParticipantChartPoint): ParticipantChartPoint[] {
  return point.time <= PARTICIPANT_CHART_DURATION_SECONDS ? [...history, point] : history;
}

export interface ParticipantFinalResult { reading: ParticipantDisplayReading; elapsedSeconds: number; history: ParticipantChartPoint[]; }
interface ParticipantSessionScreenProps { mode: RuntimeMode; reading: ParticipantDisplayReading; elapsedSeconds: number; connected: boolean; coach: LiveCoachFeedback; victimType: VictimType; playerCount?: number; started?: boolean; ended?: boolean; finalResult?: ParticipantFinalResult; history?: ParticipantChartPoint[]; onConfigure?: (victimType: VictimType, playerCount: number) => void; onStart?: () => void; onEnd?: () => void; onChangeSettings?: () => void; }

const STATUS_STYLE: Record<MonitoringStatus, { label: string; valueColor: string; coachBackground: string; coachMuted: string; icon: string }> = {
  normal: { label: '좋아요', valueColor: '#3182f6', coachBackground: '#3182f6', coachMuted: '#dcecff', icon: 'bg-white/20 text-white' },
  caution: { label: '조정이 필요해요', valueColor: '#e58a00', coachBackground: '#f59e0b', coachMuted: '#fff3d8', icon: 'bg-white/20 text-white' },
  urgent: { label: '다시 맞춰볼까요?', valueColor: '#e94040', coachBackground: '#ef4f4f', coachMuted: '#ffe2e2', icon: 'bg-white/20 text-white' }
};

function formatElapsed(totalSeconds: number): string { const seconds = Math.max(0, Math.floor(totalSeconds)); return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`; }

function CoreMetricCard({ label, value, unit, target, valueColor, icon }: { label: string; value: string; unit: string; target: string; valueColor: string; icon: React.ReactNode }) {
  return <section data-metric-size="equal" className="min-h-[265px] rounded-[28px] bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] sm:p-8"><div className="flex items-center gap-2 text-base font-bold text-slate-500">{icon}{label}</div><div className="mt-8 flex items-end gap-2"><strong style={{ color: valueColor }} className="text-7xl font-extrabold leading-none tracking-[-0.07em] tabular-nums sm:text-[8.5rem]">{value}</strong><span className="mb-1.5 text-xl font-bold text-slate-400 sm:text-2xl">{unit}</span></div><p className="mt-6 text-base font-semibold text-slate-400">권장 <span className="text-slate-700">{target}</span></p></section>;
}

function SmallMetricCard({ label, value, unit, description, icon, accent = 'text-[#3182f6]' }: { label: string; value: string; unit: string; description: string; icon: React.ReactNode; accent?: string }) {
  return <article className="rounded-3xl bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.035)]"><p className="flex items-center gap-2 text-sm font-bold text-slate-500">{icon}{label}</p><div className="mt-3 flex items-end gap-1"><strong className={`text-3xl font-extrabold tracking-[-0.05em] tabular-nums ${accent}`}>{value}</strong>{unit && <span className="mb-0.5 text-sm font-bold text-slate-400">{unit}</span>}</div><p className="mt-2 text-xs font-medium text-slate-400">{description}</p></article>;
}

function TrendChart({ title, data, dataKey, color, domain, target, targetLabel }: { title: string; data: ParticipantChartPoint[]; dataKey: 'depth' | 'bpm'; color: string; domain: [number, number]; target: [number, number]; targetLabel: string }) {
  data = [
    { time: 0, depth: Number.NaN, bpm: Number.NaN },
    ...data,
    { time: PARTICIPANT_CHART_DURATION_SECONDS, depth: Number.NaN, bpm: Number.NaN }
  ];
  return <section className="rounded-[28px] bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.035)] sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-extrabold tracking-[-0.03em] text-slate-800">{title}</h2><span className="rounded-full bg-[#ecf9f2] px-3 py-1.5 text-xs font-bold text-[#0a9b64]">{targetLabel}</span></div><div className="h-52 w-full sm:h-60"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#edf0f4" vertical={false} /><XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(value) => `${Math.round(value)}초`} minTickGap={36} tick={{ fill: '#6b7684', fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} /><YAxis domain={domain} tick={{ fill: '#4e5968', fontSize: 14, fontWeight: 700 }} axisLine={false} tickLine={false} width={44} /><Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e5e8eb', borderRadius: '14px', boxShadow: '0 6px 18px rgba(0,0,0,.08)' }} labelFormatter={(value) => `${Math.round(Number(value))}초`} labelStyle={{ color: '#6b7684' }} itemStyle={{ color, fontWeight: 700 }} /><ReferenceArea y1={target[0]} y2={target[1]} fill="#20c997" fillOpacity={0.14} /><Line type="monotone" dataKey={dataKey} name={dataKey === 'depth' ? '깊이' : '속도'} stroke={color} strokeWidth={3.5} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></section>;
}

function ResultMetricCard({ label, value, unit, icon, tone = 'blue' }: { label: string; value: string; unit: string; icon: React.ReactNode; tone?: 'blue' | 'green' | 'orange' | 'purple' }) {
  const tones = { blue: 'bg-[#edf4ff] text-[#3182f6]', green: 'bg-[#ecf9f2] text-[#0a9b64]', orange: 'bg-[#fff8e6] text-[#d68100]', purple: 'bg-[#f0ecff] text-[#7d5ce6]' };
  return <article className={`rounded-3xl p-5 ${tones[tone]}`}><p className="flex items-center gap-2 text-sm font-bold text-slate-500">{icon}{label}</p><div className="mt-3 flex items-end gap-1"><strong className="text-4xl font-extrabold tracking-[-0.06em] tabular-nums">{value}</strong><span className="mb-1 text-base font-bold text-slate-400">{unit}</span></div></article>;
}

type FinalFeedback = { summary: string; strength: string; priority: string; nextGoal: string; scope: string; depthPercent: number; ratePercent: number; bothPercent: number; averageDepth: number; averageBpm: number };

function buildFinalFeedback(points: ParticipantChartPoint[], result: ParticipantDisplayReading, victimType: VictimType, elapsedSeconds: number): FinalFeedback {
  const samples: DataPoint[] = points.map((point) => ({ time: `${point.time}초`, timestamp: Math.round(point.time * 1_000), depth: point.depth, bpm: point.bpm }));
  const analysis = analyzeCprSession(samples, victimType);
  const profile = CPR_PROFILES[victimType];
  if (analysis.insufficientData) {
    return { summary: `${formatElapsed(elapsedSeconds)} 동안 ${result.compressionCount}회의 압박이 기록됐지만, 분석에 필요한 측정 샘플이 아직 충분하지 않습니다.`, strength: '완료 압박 기록을 시작했습니다.', priority: '깊이와 속도의 일관성을 판단할 기록이 부족합니다.', nextGoal: `다음 라운드에서는 최소 10초 이상 ${profile.guideDepth} 깊이와 100–120회/분 리듬을 유지해 보세요.`, scope: '깊이·속도 측정값만 분석합니다. 복귀율은 변위 기준 · 손 압력·손 위치·환기 품질 미측정', depthPercent: 0, ratePercent: 0, bothPercent: 0, averageDepth: 0, averageBpm: 0 };
  }
  return { summary: `${formatElapsed(elapsedSeconds)} 동안 ${result.compressionCount}회의 압박이 기록됐습니다. 평균 깊이 ${analysis.averageDepth.toFixed(1)}cm · 평균 속도 ${analysis.averageBpm}회/분이며, 깊이·속도를 동시에 맞춘 측정 샘플은 ${analysis.properPercent}%입니다.`, strength: analysis.strength, priority: analysis.priority, nextGoal: analysis.nextGoal, scope: '깊이·속도 측정값만 분석합니다. 복귀율은 변위 기준 · 손 압력·손 위치·환기 품질 미측정', depthPercent: analysis.depthProperPercent, ratePercent: analysis.rateProperPercent, bothPercent: analysis.properPercent, averageDepth: analysis.averageDepth, averageBpm: analysis.averageBpm };
}

function buildFatigueSignal(points: ParticipantChartPoint[], victimType: VictimType, elapsedSeconds: number, playerCount: number): { title: string; tone: 'blue' | 'orange' | 'green'; text: string } {
  const profile = CPR_PROFILES[victimType];
  if (elapsedSeconds < 30 || points.length < 8) {
    return { title: '피로 추세 분석 준비 중', tone: 'blue', text: '피로 추세는 최소 30초 이상의 연속 기록이 있어야 판단합니다. 다음 실습에서는 충분히 압박한 뒤 전반부와 후반부의 깊이·속도 변화를 비교합니다.' };
  }
  const windowSize = Math.max(3, Math.floor(points.length * 0.3));
  const average = (values: ParticipantChartPoint[]) => values.reduce((sum, value) => ({ depth: sum.depth + value.depth, bpm: sum.bpm + value.bpm }), { depth: 0, bpm: 0 });
  const earlyTotal = average(points.slice(0, windowSize));
  const lateTotal = average(points.slice(-windowSize));
  const earlyDepth = earlyTotal.depth / windowSize;
  const lateDepth = lateTotal.depth / windowSize;
  const earlyBpm = earlyTotal.bpm / windowSize;
  const lateBpm = lateTotal.bpm / windowSize;
  const depthChange = Math.round(((lateDepth - earlyDepth) / earlyDepth) * 100);
  const rateChange = Math.round(((lateBpm - earlyBpm) / earlyBpm) * 100);
  const depthDrop = depthChange <= -10;
  const rateDrop = rateChange <= -10;
  const needsRotation = elapsedSeconds >= 120 && playerCount >= 2;
  if (depthDrop || rateDrop) {
    const changes = [depthDrop ? `깊이 ${Math.abs(depthChange)}% 감소` : '', rateDrop ? `속도 ${Math.abs(rateChange)}% 감소` : ''].filter(Boolean).join(' · ');
    return { title: '피로 가능성 신호', tone: 'orange', text: `전반부 대비 후반부에 ${changes}가 관찰됐습니다. 이는 피로 또는 자세 변화의 신호일 수 있으나, 센서값만으로 피로를 확정할 수는 없습니다. 후반부 평균 깊이 ${lateDepth.toFixed(1)}cm를 ${profile.guideDepth} 목표와 비교해 자세를 재점검하세요.${needsRotation ? ' 2명 이상 실습에서는 약 2분마다 교대를 권장합니다.' : ''}` };
  }
  if (needsRotation) {
    return { title: '교대 권고 구간', tone: 'orange', text: `현재 ${formatElapsed(elapsedSeconds)} 동안 연속 압박했습니다. 깊이와 속도가 유지되더라도 2명 이상일 때는 약 2분마다 교대하는 것이 권장됩니다. 교대는 압박 중단이 길어지지 않도록 준비한 상태에서 진행하세요.` };
  }
  return { title: '후반부 일관성 유지', tone: 'green', text: `전반부와 후반부의 평균 깊이 변화는 ${depthChange >= 0 ? '+' : ''}${depthChange}%, 속도 변화는 ${rateChange >= 0 ? '+' : ''}${rateChange}%입니다. 현재 기록에서는 큰 하락 신호가 보이지 않습니다. 다만 피로는 개인차가 크므로 깊이가 목표 범위 아래로 내려가면 즉시 자세를 점검하세요.` };
}

function FatigueSignalCard({ signal }: { signal: ReturnType<typeof buildFatigueSignal> }) {
  const tone = signal.tone === 'orange' ? 'bg-[#fff8e6] text-[#d68100]' : signal.tone === 'green' ? 'bg-[#ecf9f2] text-[#0a9b64]' : 'bg-[#edf4ff] text-[#3182f6]';
  return <section className={`mt-5 rounded-[28px] p-6 ${tone}`}><p className="flex items-center gap-2 text-sm font-extrabold"><ActivityIcon className="h-5 w-5" />그래프 기반 피로·일관성 분석</p><h3 className="mt-2 text-2xl font-extrabold tracking-[-0.05em]">{signal.title}</h3><p className="mt-3 max-w-4xl text-base font-medium leading-7 text-slate-600">{signal.text}</p><p className="mt-3 text-xs font-semibold text-slate-500">근거: 후반부 깊이 저하는 90–120초부터 관찰될 수 있으며, 2명 이상일 때 약 2분마다 교대가 권고됩니다. 이는 교육용 추세 알림이며 피로의 의학적 진단이 아닙니다.</p></section>;
}

export function ParticipantSessionScreen({ mode, reading, elapsedSeconds, connected, coach, victimType, playerCount = 1, started = true, ended = false, finalResult, history = [], onConfigure, onStart, onEnd, onChangeSettings }: ParticipantSessionScreenProps) {
  const effectiveStatus: MonitoringStatus = coach.severity === 'good' ? 'normal' : coach.severity === 'urgent' || coach.severity === 'offline' ? 'urgent' : 'caution';
  const style = STATUS_STYLE[effectiveStatus];
  const recoil = mode === 'live' && !connected ? null : reading.recoil;
  const profile = CPR_PROFILES[victimType];
  const chartHistory = history.length > 0 ? history : [{ time: 0, depth: reading.depthCm, bpm: reading.rate }];
  const missionProgress = Math.min(100, Math.round((reading.compressionCount / 60) * 100));
  const frozenResult = finalResult ?? { reading, elapsedSeconds, history: chartHistory };
  const finalFeedback = ended ? buildFinalFeedback(frozenResult.history, frozenResult.reading, victimType, frozenResult.elapsedSeconds) : null;
  const fatigueSignal = ended ? buildFatigueSignal(frozenResult.history, victimType, frozenResult.elapsedSeconds, playerCount) : null;

  if (ended && finalFeedback) {
    return <main className="min-h-screen bg-[#f2f4f6] px-4 py-5 text-slate-800 sm:px-6 sm:py-8"><div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(0,0,0,0.035)] sm:px-7"><div className="flex items-center gap-3"><span className="rounded-2xl bg-[#e8f3ff] p-3 text-[#3182f6]"><HeartPulseIcon className="h-7 w-7" /></span><div><h1 className="text-2xl font-extrabold tracking-[-0.05em]">LifePulse</h1><p className="mt-0.5 text-sm font-medium text-slate-400">CPR 실습 · 결과 리포트</p></div></div><div className="flex items-center gap-2 rounded-xl bg-[#f2f4f6] px-3 py-2 font-bold text-slate-600"><Clock3Icon className="h-4 w-4 text-[#3182f6]" />기록 종료 · {formatElapsed(frozenResult.elapsedSeconds)}</div></header>
      <section className="mt-5 rounded-[32px] bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.05)] sm:p-8"><p className="text-sm font-bold text-[#3182f6]">실습 종료 · {profile.label} · {playerCount}명</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.06em] text-slate-800 sm:text-4xl">AI 세션 종합 피드백</h2><p className="mt-4 text-base font-medium leading-7 text-slate-500">{finalFeedback.summary}</p><div className="mt-6 grid gap-3 sm:grid-cols-3"><article className="rounded-2xl bg-[#ecf9f2] p-5"><p className="text-sm font-extrabold text-[#0a9b64]">잘한 점</p><p className="mt-2 font-bold leading-7 text-slate-700">{finalFeedback.strength}</p></article><article className="rounded-2xl bg-[#fff8e6] p-5"><p className="text-sm font-extrabold text-[#d68100]">가장 큰 교정</p><p className="mt-2 font-bold leading-7 text-slate-700">{finalFeedback.priority}</p></article><article className="rounded-2xl bg-[#edf4ff] p-5"><p className="text-sm font-extrabold text-[#3182f6]">다음 라운드 목표</p><p className="mt-2 font-bold leading-7 text-slate-700">{finalFeedback.nextGoal}</p></article></div><div className="mt-3 rounded-2xl bg-[#f2f4f6] px-4 py-3 text-sm font-medium leading-6 text-slate-500"><strong className="text-slate-700">분석 범위 · </strong>{finalFeedback.scope}</div></section>
      {fatigueSignal && <FatigueSignalCard signal={fatigueSignal} />}
      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ResultMetricCard label="완료 압박" value={frozenResult.reading.compressionCount.toString()} unit="회" icon={<HeartPulseIcon className="h-4 w-4 text-[#3182f6]" />} /><ResultMetricCard label="최종 점수" value={frozenResult.reading.score.toString()} unit="점" icon={<ActivityIcon className="h-4 w-4 text-[#d68100]" />} tone="orange" /><ResultMetricCard label="평균 깊이" value={finalFeedback.averageDepth.toFixed(1)} unit="cm" icon={<ArrowDownIcon className="h-4 w-4 text-[#0a9b64]" />} tone="green" /><ResultMetricCard label="평균 속도" value={finalFeedback.averageBpm.toString()} unit="회/분" icon={<GaugeIcon className="h-4 w-4 text-[#7d5ce6]" />} tone="purple" /></section>
      <section className="mt-5 grid gap-4 lg:grid-cols-2"><TrendChart title="전체 압박 깊이" data={frozenResult.history} dataKey="depth" color="#3182f6" domain={[0, 8]} target={[profile.targetDepthCm.min, profile.targetDepthCm.max]} targetLabel={profile.guideDepth} /><TrendChart title="전체 압박 속도" data={frozenResult.history} dataKey="bpm" color="#20a779" domain={[60, 160]} target={[100, 120]} targetLabel="100–120회/분" /></section>
      <section className="mt-5 grid gap-3 sm:grid-cols-3"><ResultMetricCard label="깊이 적정" value={finalFeedback.depthPercent.toString()} unit="%" icon={<ArrowDownIcon className="h-4 w-4 text-[#3182f6]" />} /><ResultMetricCard label="속도 적정" value={finalFeedback.ratePercent.toString()} unit="%" icon={<GaugeIcon className="h-4 w-4 text-[#0a9b64]" />} tone="green" /><ResultMetricCard label="동시 적정" value={finalFeedback.bothPercent.toString()} unit="%" icon={<SparklesIcon className="h-4 w-4 text-[#7d5ce6]" />} tone="purple" /></section>
      <section className="mt-5 grid gap-3 sm:grid-cols-2"><a href="/guide" className="flex items-center justify-center gap-2 rounded-2xl bg-[#edf4ff] px-5 py-4 font-extrabold text-[#3182f6] transition hover:bg-[#e1eeff]"><BookOpenIcon className="h-5 w-5" />대상별 자세·손 모양 다시 보기</a><button type="button" onClick={onChangeSettings} className="rounded-2xl bg-white px-5 py-4 font-extrabold text-slate-600 shadow-[0_8px_24px_rgba(0,0,0,0.035)] transition hover:bg-[#e8ecef]">새 실습 설정하기</button></section>
      <p className="mt-5 px-2 text-sm leading-6 text-slate-400">교육용 프로토타입 측정값 · 깊이·속도만 분석합니다. 복귀율은 변위 기준 · 손 압력·손 위치·환기 품질 미측정</p>
    </div></main>;
  }

  return <main className="min-h-screen bg-[#f2f4f6] px-4 py-5 text-slate-800 sm:px-6 sm:py-8"><div className="mx-auto max-w-6xl">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(0,0,0,0.035)] sm:px-7"><div className="flex items-center gap-3"><span className="rounded-2xl bg-[#e8f3ff] p-3 text-[#3182f6]"><HeartPulseIcon className="h-7 w-7" /></span><div><h1 className="text-2xl font-extrabold tracking-[-0.05em]">LifePulse</h1><p className="mt-0.5 text-sm font-medium text-slate-400">CPR 실습 · 스테이션 A</p></div></div><div className="flex items-center gap-3"><ModeBadge mode={mode} connected={connected} /><div className="flex items-center gap-2 rounded-xl bg-[#f2f4f6] px-3 py-2 font-bold text-slate-600"><TimerIcon className="h-4 w-4 text-[#3182f6]" />{started ? formatElapsed(ended ? frozenResult.elapsedSeconds : elapsedSeconds) : '시작 전'}</div></div></header>
    {!connected && mode === 'live' && <div role="alert" className="mt-5 rounded-2xl bg-[#fff0f0] px-5 py-4 text-center font-bold text-[#e94040]">센서 연결을 기다리고 있어요. WebSocket 서버와 ESP32 상태를 확인해 주세요.</div>}
    {!started ? <section className="mx-auto mt-5 max-w-3xl rounded-[32px] bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.05)] sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-bold text-[#3182f6]">실습 설정</p><h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em]">대상과 인원을 선택하세요</h2></div><span className="flex items-center gap-1.5 rounded-full bg-[#f2f4f6] px-3 py-2 text-sm font-bold text-slate-600"><UsersIcon className="h-4 w-4 text-[#3182f6]" />{playerCount}명 실습</span></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center"><div className="grid grid-cols-3 gap-2">{(Object.keys(CPR_PROFILES) as VictimType[]).map((type) => <button type="button" key={type} onClick={() => onConfigure?.(type, playerCount)} aria-pressed={victimType === type} className={`rounded-2xl px-3 py-3 text-center transition ${victimType === type ? 'bg-[#3182f6] text-white shadow-[0_8px_16px_rgba(49,130,246,0.22)]' : 'bg-[#f2f4f6] text-slate-500 hover:bg-[#e8f3ff]'}`}><strong className="block text-base">{CPR_PROFILES[type].label}</strong><span className={`mt-1 block text-xs font-semibold ${victimType === type ? 'text-white/80' : 'text-slate-400'}`}>({CPR_PROFILES[type].description})</span><span className={`mt-1 block text-xs font-semibold ${victimType === type ? 'text-white/80' : 'text-slate-400'}`}>{CPR_PROFILES[type].guideDepth}</span></button>)}</div>
        <div className="grid grid-cols-4 gap-2">{[1, 2, 3, 4].map((count) => <button type="button" key={count} onClick={() => onConfigure?.(victimType, count)} aria-pressed={playerCount === count} className={`rounded-xl px-3 py-3 text-center text-sm font-extrabold transition ${playerCount === count ? 'bg-[#0a9b64] text-white' : 'bg-[#f2f4f6] text-slate-500 hover:bg-[#ecf9f2]'}`}>{count}명</button>)}</div>
      </div>
      <div className="mt-6 rounded-2xl bg-[#f2f7ff] px-4 py-3 text-sm font-semibold leading-6 text-slate-600">{profile.label} 실습 · 권장 깊이 {profile.guideDepth} · 속도 100–120회/분</div>
      <a href="/guide" className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#edf4ff] px-5 py-3.5 font-extrabold text-[#3182f6] transition hover:bg-[#e1eeff]"><BookOpenIcon className="h-5 w-5" />대상별 자세·손 모양 먼저 보기</a>
      <button type="button" onClick={onStart} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3182f6] px-5 py-4 text-lg font-extrabold text-white shadow-[0_10px_20px_rgba(49,130,246,0.25)] transition hover:bg-[#1b6fe5]"><PlayIcon className="h-5 w-5 fill-current" />이 설정으로 실습 시작하기</button>
    </section> : ended ? <section className="mx-auto mt-5 max-w-3xl rounded-[32px] bg-white p-7 text-center shadow-[0_12px_30px_rgba(0,0,0,0.05)] sm:p-10"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f3ff] text-[#3182f6]"><HeartPulseIcon className="h-8 w-8" /></span><p className="mt-5 text-sm font-bold text-[#3182f6]">실습 종료</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.06em] text-slate-800">수고했어요!</h2><p className="mt-3 text-base font-medium text-slate-500">{profile.label} · {playerCount}명 실습을 종료했습니다.</p><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#f2f7ff] p-4"><p className="text-sm font-bold text-slate-500">완료 압박</p><strong className="mt-1 block text-3xl font-extrabold text-[#3182f6]">{reading.compressionCount}<span className="ml-1 text-base text-slate-400">회</span></strong></div><div className="rounded-2xl bg-[#fff8e6] p-4"><p className="text-sm font-bold text-slate-500">실시간 점수</p><strong className="mt-1 block text-3xl font-extrabold text-[#e58a00]">{reading.score}<span className="ml-1 text-base text-slate-400">점</span></strong></div></div><a href="/guide" className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#edf4ff] px-5 py-4 font-extrabold text-[#3182f6] transition hover:bg-[#e1eeff]"><BookOpenIcon className="h-5 w-5" />대상별 자세·손 모양 다시 보기</a><button type="button" onClick={onChangeSettings} className="mt-3 w-full rounded-2xl bg-[#f2f4f6] px-5 py-4 font-extrabold text-slate-600 transition hover:bg-[#e8ecef]">새 실습 설정하기</button></section> : <><section className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.035)]"><p className="font-bold text-slate-600"><span className="text-[#3182f6]">{profile.label}</span> · {playerCount}명 실습 진행 중</p><div className="flex gap-2"><button type="button" onClick={onChangeSettings} className="rounded-xl bg-[#f2f4f6] px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-[#e8f3ff]">설정 변경</button><button type="button" onClick={onEnd} className="flex items-center gap-1.5 rounded-xl bg-[#fff0f0] px-3 py-2 text-sm font-bold text-[#e94040] transition hover:bg-[#ffe2e2]"><SquareIcon className="h-3.5 w-3.5 fill-current" />실습 종료</button></div></section>
    <section className="mt-5 grid gap-4 lg:grid-cols-2"><CoreMetricCard label="현재 압박 깊이" value={reading.depthCm.toFixed(1)} unit="cm" target={profile.guideDepth} valueColor={style.valueColor} icon={<ArrowDownIcon className="h-5 w-5 text-[#3182f6]" />} /><CoreMetricCard label="현재 압박 속도" value={reading.rate.toString()} unit="회/분" target="100–120회" valueColor={style.valueColor} icon={<GaugeIcon className="h-5 w-5 text-[#3182f6]" />} /></section>
    <section style={{ backgroundColor: style.coachBackground }} className="mt-5 overflow-hidden rounded-[28px] p-6 text-white shadow-[0_10px_26px_rgba(49,130,246,0.16)] sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-3"><span className={`rounded-2xl p-3 ${style.icon}`}><SparklesIcon className="h-6 w-6" /></span><div><p className="text-sm font-bold opacity-80">AI CPR 코치 · {coach.title}</p><h2 className="mt-1 text-2xl font-extrabold tracking-[-0.05em] sm:text-3xl">{coach.action}</h2></div></div><span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold">{style.label}</span></div><p style={{ color: style.coachMuted }} className="mt-5 text-base font-medium">{coach.rationale}</p><div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/15 pt-4 text-sm font-semibold"><span className="rounded-lg bg-white/15 px-2.5 py-1.5">판단 근거</span><span style={{ color: style.coachMuted }}>{coach.criterion}</span></div></section>
    <section className="mt-5 rounded-[28px] bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.035)] sm:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold text-[#3182f6]">오늘의 미션</p><h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em]">60회 안정 압박 이어가기</h2></div><strong className="text-2xl font-extrabold tracking-[-0.05em] text-[#3182f6]">{reading.compressionCount}<span className="text-base text-slate-400"> / 60</span></strong></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-[#edf0f4]"><div className="h-full rounded-full bg-gradient-to-r from-[#3182f6] to-[#6faaff] transition-all duration-500" style={{ width: `${missionProgress}%` }} /></div></section>
    <section className="mt-5 grid gap-4 lg:grid-cols-2"><TrendChart title="최근 압박 깊이" data={chartHistory} dataKey="depth" color="#3182f6" domain={[0, 8]} target={[profile.targetDepthCm.min, profile.targetDepthCm.max]} targetLabel={profile.guideDepth} /><TrendChart title="최근 압박 속도" data={chartHistory} dataKey="bpm" color="#20a779" domain={[60, 160]} target={[100, 120]} targetLabel="100–120회/분" /></section>
    <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><SmallMetricCard label="실시간 점수" value={reading.score.toString()} unit="점" description="75점 이상 목표" icon={<ActivityIcon className="h-4 w-4 text-[#f59e0b]" />} accent="text-[#f59e0b]" /><SmallMetricCard label="누적 압박" value={reading.compressionCount.toString()} unit="회" description="멈춤은 짧게" icon={<HeartPulseIcon className="h-4 w-4 text-[#ef4f4f]" />} accent="text-[#ef4f4f]" /><SmallMetricCard label="이완 복귀율" value={recoil == null ? '—' : recoil.toFixed(1)} unit={recoil == null ? '' : '%'} description={recoil == null ? '측정 대기' : '직전 압박의 변위 복귀'} icon={<RotateCcwIcon className="h-4 w-4 text-slate-400" />} accent="text-slate-500" /><SmallMetricCard label="다음 목표" value="60" unit="회" description="안정 압박 챌린지" icon={<ChevronRightIcon className="h-4 w-4 text-[#3182f6]" />} /></section>
    <footer className="mt-5 px-2 text-sm leading-6 text-slate-400"><p>{profile.label} 깊이 {profile.guideDepth} · 속도 100–120회/분</p><p>복귀율은 변위 기준 · 손 압력·손 위치·환기 품질 미측정</p></footer></>}
  </div></main>;
}
