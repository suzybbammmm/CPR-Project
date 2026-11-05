import { Activity, ArrowDown, HeartPulse, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import type { DataPoint } from '../types/game.types';
import type { LiveCoachFeedback } from '../utils/cprCoach';
import type { PracticeJudgement } from '../utils/practiceGame';
import { VoiceCoach } from './VoiceCoach';
import './live-practice-dashboard.css';

type FeedbackTone = 'good' | 'caution' | 'urgent';
interface LivePracticeMonitorProps {
  victimLabel: string; targetDepth: string; targetDepthRange: [number,number]; handPlacement: string; connected: boolean; depth: number; bpm: number; recoil?: number | null;
  feedback: string; feedbackTone: FeedbackTone; coach: LiveCoachFeedback; compressionCount: number; properPercent: number;
  averageDepth: number; averageBpm: number; score: number; accuracyScore: number | null; grade: string | null; combo: number;
  judgement: PracticeJudgement; matchPercent: number; depthScore: number; rateScore: number; recoilLimited: boolean;
  secondsRemaining: number; playerLabel: string; assessmentDepth?: number | null; assessmentPending?: boolean; playerCount?: number; currentPlayer?: number;
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

export function LivePracticeMonitor(p: LivePracticeMonitorProps) {
  const score = Math.max(0, Math.round(p.score));
  const level = Math.min(5, Math.floor((p.accuracyScore ?? 0) / 20) + 1);
  const multiplier = p.combo >= 20 ? 8 : p.combo >= 10 ? 4 : p.combo >= 5 ? 2 : 1;
  const nextMilestone=p.combo<5?5:p.combo<10?10:p.combo<20?20:null;
  const guideDepth=p.assessmentDepth??p.depth;
  const depthGood=guideDepth>=p.targetDepthRange[0]&&guideDepth<=p.targetDepthRange[1];
  const hasStarted=p.compressionCount>0||p.depth>=1.5||p.history.some(point=>point.depth>=1.5);
  const waiting=!hasStarted;
  const measuring=hasStarted&&(p.compressionCount===0||p.bpm<=0||p.assessmentPending);
  const judgement=!p.connected?'SENSOR WAIT':waiting?'READY':p.compressionCount===0&&p.matchPercent===0?'더 깊게!':p.judgement.toUpperCase();
  const judgementCopy={
    miss:'압박을 시작하거나 다시 측정하세요',
    bad:'깊이 또는 속도를 크게 조절하세요',
    good:'좋아요, 기준에 가까워요',
    great:'거의 정확해요!',
    perfect:'완벽한 압박입니다!',
  }[p.judgement];
  const rhythmText=!p.connected?'센서 연결을 확인하세요':!hasStarted?'첫 압박을 시작하세요':measuring?'압박 중 · 리듬을 측정하고 있어요':p.bpm<=0?'속도를 계산하고 있어요':p.bpm<100?'리듬을 더 빠르게':p.bpm>120?'리듬을 조금 느리게':'좋아요! 이 리듬을 유지하세요';
  const depthText=!p.connected?'센서 연결을 확인하세요':guideDepth<=.5?'압박을 시작하세요':guideDepth<p.targetDepthRange[0]?'깊이를 더 확보하세요.':guideDepth>p.targetDepthRange[1]?'압박 깊이를 조금 줄이세요.':'좋아요! 적정 깊이입니다.';
  const guideText=!p.connected?'센서를 연결하면 실시간 판정을 시작합니다.':waiting?'압박을 시작하면 바로 반응해요':p.assessmentPending?'깊이 기준 임시 판정 · 속도가 측정되면 두 기준 중 낮은 판정 적용':`일치율 ${p.matchPercent}% · 깊이 ${p.depthScore}점 · 속도 ${p.rateScore}점`;
  const practiceStatus=!p.connected?'센서 연결 대기':p.secondsRemaining<=0?'실습 종료!':!hasStarted?'첫 압박 대기':measuring?'압박 중 · 측정 중':p.secondsRemaining<=5?`마지막 ${Math.ceil(p.secondsRemaining)}초`:`실습 진행 중 · ${p.compressionCount}회`;
  const recoilTone=p.recoil===null||p.recoil===undefined?'pending':p.recoil>=90?'good':p.recoil>=80?'caution':'low';
  const recoilText=recoilTone==='pending'?'측정 대기':recoilTone==='good'?'완전 이완':recoilTone==='caution'?'조금 더 이완하세요':'가슴을 충분히 이완하세요';
  const recoilColor=recoilTone==='good'?'#12b878':recoilTone==='caution'?'#f59e0b':recoilTone==='low'?'#ef5350':'#cbd5e1';
  const voiceKind=!p.connected?'offline':p.judgement==='perfect'||p.judgement==='great'?'good':p.judgement==='miss'&&p.compressionCount===0?'waiting':'correction';
  return <main className="lp-dashboard" aria-label="실시간 CPR 실습 모니터">
    <span className="sr-only">오늘의 미션 · 레벨 {level} · 실시간 압박 깊이 · 직전 압박의 변위 복귀</span>
    <header className="lp-header"><div className="lp-brand"><span><HeartPulse size={29} /></span><div><p>LifePulse · {p.victimLabel} · 1명 순환 실습</p><h1>{p.playerLabel} <small>{p.currentPlayer??1}/{p.playerCount??1}</small></h1></div></div><div className={`lp-timer ${p.secondsRemaining <= 15 ? 'urgent' : ''}`}><i style={{ width: `${clamp(p.secondsRemaining / 30 * 100, 0, 100)}%` }} /><strong>{formatTime(p.secondsRemaining)}</strong><button type="button" onClick={p.onFinish}>차례 종료</button></div></header>
    <section className="lp-top-grid"><article aria-live="polite" className={`lp-card lp-recoil ${recoilTone}`}><div className="lp-ring" style={{background:`conic-gradient(${recoilColor} 0 ${clamp(p.recoil??0,0,100)}%,#eef2f8 ${clamp(p.recoil??0,0,100)}%)`}}><b>{p.recoil == null ? '—' : Math.round(p.recoil)}<small>%</small></b></div><div><h2>이완 복귀율</h2><p>{recoilText} <span>· 목표 90%↑</span></p></div></article><article className="lp-card lp-score"><div><p>게임 점수</p><strong>{score}<small>PT</small></strong><span>정확도 {p.accuracyScore===null?'채점 대기':`${p.accuracyScore}점`} · 등급 {p.grade??'—'}</span></div><div className="lp-combo"><b>{p.combo}</b><span>콤보</span><em className={`x${multiplier}`}>×{multiplier}</em><div><p>{nextMilestone?`${nextMilestone-p.combo}콤보 더 하면 ×${multiplier*2}`:'최고 ×8 배수 유지 중'}</p><i><span style={{ width: `${clamp(p.combo / 20 * 100, 0, 100)}%` }} /></i></div></div></article><article className={`lp-card lp-finish ${!p.connected?'waiting':''}`}><div aria-live="polite"><h2>{practiceStatus}</h2><p>{p.compressionCount}회 완료 · {Math.ceil(30-p.secondsRemaining)}초 경과</p><progress aria-label="실습 진행률" max={30} value={30-p.secondsRemaining}/></div><button type="button" onClick={p.onFinish}>⚑ 지금 종료</button></article></section>
    <section className="lp-main-grid"><article className="lp-card lp-metric"><h2><ArrowDown size={24} /> 압박 깊이 <span>목표 {p.targetDepth}</span></h2><strong>{p.depth.toFixed(1)}<small>cm</small></strong><Gauge value={p.depth} max={8} target={p.targetDepthRange} label="압박 깊이" /><p className="lp-status"><b />{depthText}</p></article><article className="lp-card lp-rhythm"><header><h2><HeartPulse size={26} /> 리듬 가이드 <span>목표 110회/분</span></h2><VoiceCoach notice={{text:depthGood?rhythmText:depthText,kind:voiceKind}} eventCount={p.compressionCount}/></header><div className="lp-ecg" aria-hidden="true"><motion.svg viewBox="0 0 620 304" animate={{ scale: [0.82, 0.9, 0.82] }} transition={{ duration: 60/110, repeat: Infinity, ease: 'easeInOut' }}><motion.path key={p.compressionCount} d="M12 180 H170 L200 128 L228 236 L252 14 L276 290 L304 132 L330 180 H436 C404 150 398 98 430 80 C454 67 476 84 480 108 C484 84 506 67 530 80 C562 98 556 150 524 180 H608" initial={{ pathLength: 0, opacity: .4 }} animate={{ pathLength: 1, opacity: .62 }} transition={{ duration: .45, ease: 'easeOut' }} /></motion.svg></div><motion.div key={`${p.compressionCount}-${judgement}-${p.matchPercent}`} initial={{ scale: .92, opacity: .7 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: .3 }} className={`lp-judgement judgement-${p.connected?p.judgement:'miss'}`}><b>{judgement}</b><strong>{p.combo} COMBO</strong><span>{!p.connected?'센서 연결 대기':waiting?'리듬을 잡아보세요!':judgementCopy}</span><small>{guideText}</small></motion.div></article><article className="lp-card lp-metric"><h2><Activity size={24} /> 압박 속도 <span>목표 100–120회/분</span></h2><strong>{p.bpm}<small>회/분</small></strong><Gauge value={p.bpm} max={160} target={[100, 120]} direction="up" label="압박 속도" /><p className="lp-status"><b />{rhythmText}</p></article></section>
    <section className="lp-summary"><span>누적 압박 <b>{p.compressionCount}회</b></span><span>적정 압박 비율 <b>{p.properPercent}%</b></span><span>평균 깊이 <b>{p.averageDepth.toFixed(1)}cm</b></span><span>평균 속도 <b>{p.averageBpm}회/분</b></span><span className="push-right">{p.rotationMessage}</span></section>
    <details className="lp-details"><summary>압박 기록과 점수 기준 <span>기준 보기 ＋</span></summary><p><ShieldCheck size={16} /> AI CPR 코치 · {p.coach.action} · {p.coach.criterion}</p><p>완료 압박의 깊이·속도 중 낮은 판정 · PERFECT 100점 · GREAT 75점 · GOOD 50점 · BAD 25점 · MISS 0점</p><p>속도: 100–120 PERFECT · 85–99 / 121–138 GREAT · 70–84 / 139–156 GOOD · 55–69 / 157–174 BAD · 그 외 MISS</p><p>성인 깊이(cm): 5–6 PERFECT · 4.25–4.99 / 6.01–6.90 GREAT · 3.50–4.24 / 6.91–7.80 GOOD · 2.75–3.49 / 7.81–8.70 BAD · 그 외 MISS</p><p>MISS·BAD 콤보 초기화 · GOOD 유지 · GREAT·PERFECT +1 · 이완 복귀율은 점수에서 제외</p><p>손 압력·손 위치·환기 품질 미측정 · 이완 복귀율은 센서가 전송한 최신 변위 복귀값</p></details>
    <footer className="lp-footer"><span>MISS +0 · BAD +5 · GOOD +10 · GREAT +15 · PERFECT +20 PT · 5콤보 ×2 · 10콤보 ×4 · 20콤보 ×8</span><span>{p.secondsRemaining <= 0 ? '실습 종료' : '실제 센서 측정 / 시연 모드 공통 화면'}</span></footer>
  </main>;
}
