import { Activity, ArrowDown, HeartPulse, ShieldCheck, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';
import type { DataPoint } from '../types/game.types';
import type { LiveCoachFeedback } from '../utils/cprCoach';
import './live-practice-dashboard.css';

type FeedbackTone = 'good' | 'caution' | 'urgent';
interface LivePracticeMonitorProps {
  victimLabel: string; targetDepth: string; handPlacement: string; depth: number; bpm: number; recoil?: number | null;
  feedback: string; feedbackTone: FeedbackTone; coach: LiveCoachFeedback; compressionCount: number; properPercent: number;
  averageDepth: number; averageBpm: number; score: number; combo: number; secondsRemaining: number; playerLabel: string;
  rotationMessage: string; history: DataPoint[]; onFinish: () => void;
}

const formatTime = (seconds: number) => {
  const wholeSeconds = Math.floor(Math.max(0, seconds));
  return `${Math.floor(wholeSeconds / 60).toString().padStart(2, '0')}:${(wholeSeconds % 60).toString().padStart(2, '0')}`;
};
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function Gauge({ value, max, target, direction = 'down', label }: { value: number; max: number; target: [number, number]; direction?: 'up' | 'down'; label: string }) {
  const ratio = clamp(value / max, 0, 1) * 100;
  const targetTop = direction === 'down' ? target[0] / max * 100 : 100 - target[1] / max * 100;
  const targetHeight = (target[1] - target[0]) / max * 100;
  return <div className="lp-gauge-wrap" role="img" aria-label={`${label} ${value}`}><div className="lp-gauge-scale"><span>0</span><span>{Math.round(max * .25)}</span><span>{Math.round(max * .5)}</span><b>{target[0]}</b><b>{target[1]}</b><span>{max}</span></div><div className="lp-gauge-track"><div className="lp-gauge-target" style={{ top: `${direction === 'down' ? targetTop : 100 - targetTop - targetHeight}%`, height: `${targetHeight}%` }} /><div className={`lp-gauge-fill ${direction}`} style={{ height: `${ratio}%` }} /><span className="lp-gauge-label">목표</span></div></div>;
}

function TrendChart({ title, unit, values, target }: { title: string; unit: string; values: number[]; target: [number, number] }) {
  const points = values.slice(-28); const width = 420; const height = 100;
  const min = Math.min(target[0] - (target[1] - target[0]), ...points, 0); const max = Math.max(target[1] + (target[1] - target[0]), ...points, 1);
  const x = (i: number) => 32 + i / Math.max(points.length - 1, 1) * (width - 44); const y = (v: number) => height - 18 - (v - min) / (max - min) * (height - 36);
  const path = points.reduce((result, value, index) => index === 0 ? `M ${x(index)} ${y(value)}` : `${result} C ${(x(index - 1) + x(index)) / 2} ${y(points[index - 1])}, ${(x(index - 1) + x(index)) / 2} ${y(value)}, ${x(index)} ${y(value)}`, '');
  return <section className="lp-chart"><div><h3>{title}</h3><span>{points.length ? `${points.at(-1)?.toFixed(unit === 'cm' ? 1 : 0)} ${unit}` : '압박 기록 수집 중'}</span></div><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} 그래프`} data-chart-style="smooth"><rect x="32" y={y(target[1])} width="364" height={Math.max(3, y(target[0]) - y(target[1]))} fill="#dff5e9" />{points.length > 1 && <path d={path} fill="none" stroke="#16b878" strokeWidth="3" strokeLinecap="round" />}</svg></section>;
}

export function LivePracticeMonitor(p: LivePracticeMonitorProps) {
  const score = clamp(p.score, 0, 100); const level = Math.min(5, Math.floor(score / 20) + 1); const multiplier = p.combo >= 20 ? 8 : p.combo >= 10 ? 4 : p.combo >= 5 ? 2 : 1;
  const good = p.feedbackTone === 'good'; const urgent = p.feedbackTone === 'urgent'; const judgement = good ? 'PERFECT' : urgent ? 'KEEP GOING' : 'GREAT';
  return <main className="lp-dashboard" aria-label="실시간 CPR 실습 모니터">
    <span className="sr-only">오늘의 미션 · 레벨 {level} · 직전 압박 최고 깊이 · 직전 압박의 변위 복귀</span>
    <header className="lp-header"><div className="lp-brand"><span><HeartPulse size={29} /></span><div><p>LifePulse · {p.victimLabel} · 1명 순환 실습</p><h1>{p.playerLabel} <small>1/1</small></h1></div></div><div className={`lp-timer ${p.secondsRemaining <= 15 ? 'urgent' : ''}`}><i style={{ width: `${clamp(p.secondsRemaining / 30 * 100, 0, 100)}%` }} /><strong>{formatTime(p.secondsRemaining)}</strong><button type="button" onClick={p.onFinish}>차례 종료</button></div></header>
    <section className="lp-top-grid"><article className="lp-card lp-recoil"><div className="lp-ring"><b>{p.recoil == null ? '—' : Math.round(p.recoil)}<small>%</small></b></div><div><h2>이완 복귀율</h2><p className={p.recoil == null ? '' : 'ok'}>{p.recoil == null ? '측정 대기' : '완전 이완'} <span>· 목표 90%↑</span></p></div></article><article className="lp-card lp-score"><div><p>게임 점수</p><strong>{score}<small>PT</small></strong><span>정확도 {p.properPercent}점 · 등급 {score >= 80 ? 'A' : score >= 70 ? 'B' : 'C'}</span></div><div className="lp-combo"><b>{p.combo}</b><span>콤보</span><em className={`x${multiplier}`}>×{multiplier}</em><div><p>{p.combo ? `${Math.max(0, 20 - p.combo)}콤보 더 하면 ×${multiplier === 8 ? 8 : multiplier * 2}` : '정확한 압박부터 콤보 시작'}</p><i><span style={{ width: `${clamp(p.combo / 20 * 100, 0, 100)}%` }} /></i></div></div></article><article className="lp-card lp-finish"><h2>{p.secondsRemaining <= 0 ? '실습 종료!' : '실습 진행 중'}</h2><button type="button" onClick={p.onFinish}>⚑ 결과 보기</button></article></section>
    <section className="lp-main-grid"><article className="lp-card lp-metric"><h2><ArrowDown size={24} /> 압박 깊이 <span>목표 {p.targetDepth}</span></h2><strong>{p.depth.toFixed(1)}<small>cm</small></strong><Gauge value={p.depth} max={8} target={[5, 6]} label="압박 깊이" /><p className="lp-status"><b />{good ? '좋아요! 이 깊이 그대로' : p.feedback}</p></article><article className="lp-card lp-rhythm"><header><h2><HeartPulse size={26} /> 리듬 가이드 <span>110회/분</span></h2><button type="button" aria-label="음성 코치 끄기"><VolumeX size={22} /></button></header><div className="lp-ecg" aria-hidden="true"><motion.svg viewBox="0 0 620 304" animate={{ scale: [0.82, 0.9, 0.82, 0.87, 0.82] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}><motion.path key={p.compressionCount} d="M12 180 H170 L200 128 L228 236 L252 14 L276 290 L304 132 L330 180 H436 C404 150 398 98 430 80 C454 67 476 84 480 108 C484 84 506 67 530 80 C562 98 556 150 524 180 H608" initial={{ pathLength: 0, opacity: .4 }} animate={{ pathLength: 1, opacity: .62 }} transition={{ duration: .55, ease: 'easeOut' }} /></motion.svg></div><motion.div key={`${p.compressionCount}-${judgement}`} initial={{ scale: .92, opacity: .7 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: .3 }} className={`lp-judgement ${good ? 'good' : ''}`}><b>{judgement}</b><strong>{p.combo} COMBO</strong><span>{good ? '완벽해요!' : p.feedback}</span><small>{p.coach.rationale}</small></motion.div></article><article className="lp-card lp-metric"><h2><Activity size={24} /> 압박 속도 <span>목표 100–120회/분</span></h2><strong>{p.bpm}<small>회/분</small></strong><Gauge value={p.bpm} max={160} target={[100, 120]} direction="up" label="압박 속도" /><p className="lp-status"><b />{good ? '좋아요! 이 속도를 유지하세요' : p.feedback}</p></article></section>
    <section className="lp-summary"><span>누적 압박 <b>{p.compressionCount}회</b></span><span>적정 압박 비율 <b>{p.properPercent}%</b></span><span>평균 깊이 <b>{p.averageDepth.toFixed(1)}cm</b></span><span>평균 속도 <b>{p.averageBpm}회/분</b></span><span className="push-right">{p.rotationMessage}</span></section>
    <details className="lp-details"><summary>압박 기록과 점수 기준 <span>기록 보기 ＋</span></summary><div className="lp-charts"><TrendChart title="압박별 최고값" unit="cm" values={p.history.map(point => point.depth)} target={[5, 6]} /><TrendChart title="압박 속도 변화" unit="회/분" values={p.history.map(point => point.bpm)} target={[100, 120]} /></div><p><ShieldCheck size={16} /> AI CPR 코치 · {p.coach.action} · {p.coach.criterion}</p><p>점수 · 콤보 기준 · 최대 100점 · 정확 압박 +2점 · 기준 범위를 벗어나면 콤보 초기화</p><p>손 압력·손 위치·환기 품질 미측정 · 이완 복귀율은 직전 압박의 변위 기준</p></details>
    <footer className="lp-footer"><span>Perfect +20 · Great +15 · Good +10 · Bad +5 · 5콤보 ×2 · 10콤보 ×4 · 20콤보 ×8</span><span>{p.secondsRemaining <= 0 ? '실습 종료' : '실제 센서 측정 / 시연 모드 공통 화면'}</span></footer>
  </main>;
}
