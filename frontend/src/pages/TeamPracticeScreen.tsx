import React, { useState } from 'react';
import { Activity, ArrowDown, HeartPulse, Radio, RotateCcw, Timer, Users } from 'lucide-react';
import type { RuntimeMode } from '../config/runtime';
import type { ParticipantDisplayReading, ParticipantChartPoint } from './ParticipantSessionScreen';
import type { LiveCoachFeedback } from '../utils/cprCoach';
import { CPR_PROFILES, type VictimType } from '../utils/cprGuidance';
import { TEAM_ROUND_SECONDS } from '../live/teamSession';
import type { TeamRoundResult, teamGameStats } from '../live/teamSession';
import type { ParticipantInfo, SaveStatus } from '../types/exhibition.types';
import { ParticipantRegistrationForm } from '../components/ParticipantRegistrationForm';
import { comboMultiplier } from '../utils/practiceGame';
import { CompressionBurst } from '../components/CompressionBurst';
import { LivePracticeMonitor } from '../components/LivePracticeMonitor';
import '../team-practice.css';

export interface TeamPracticeScreenProps {
 mode: RuntimeMode; victimType: VictimType; playerCount: number; phase: 'setup'|'active'|'handoff'|'results'; currentPlayerIndex: number;
 elapsedSeconds: number; remainingSeconds: number; connected: boolean; reading: ParticipantDisplayReading; coach: LiveCoachFeedback;
 game?: Pick<ReturnType<typeof teamGameStats>, 'xp'|'combo'|'maxCombo'|'scoredCount'|'score'|'grade'> & Partial<ReturnType<typeof teamGameStats>>;
 history?: ParticipantChartPoint[];
 results: TeamRoundResult[];
 participants?: ParticipantInfo[];
 saveStatus?: SaveStatus;
 onConfigure: (victimType: VictimType, playerCount: number) => void;
 onRegisterParticipants?: (participants: ParticipantInfo[]) => void;
 onStart: () => void; onEndRound: () => void; onNextPlayer: () => void; onChangeSettings: () => void;
}
const number = (value: number|null|undefined, decimals = 0) => value == null || !Number.isFinite(value) ? '—' : value.toFixed(decimals);
const clock = (seconds: number) => `${Math.floor(Math.max(0, seconds)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(0,seconds)%60).toString().padStart(2,'0')}`;
const summarizeChart = (history: ParticipantChartPoint[], kind: 'depth'|'bpm') => {
 const buckets=new Map<number,{timeTotal:number;valueTotal:number;valueMax:number;count:number}>();
 for(const point of history){
  const value=point[kind];
  if(!Number.isFinite(point.time)||!Number.isFinite(value)) continue;
  const time=Math.min(TEAM_ROUND_SECONDS,Math.max(0,point.time));
  const bucket=Math.floor(time/2);
  const current=buckets.get(bucket)??{timeTotal:0,valueTotal:0,valueMax:0,count:0};
  current.timeTotal+=time;
  current.valueTotal+=value;
  current.valueMax=Math.max(current.valueMax,value);
  current.count+=1;
  buckets.set(bucket,current);
 }
 return [...buckets.entries()].sort(([a],[b])=>a-b).map(([,bucket])=>({
  time:bucket.timeTotal/bucket.count,
  value:kind==='depth'?bucket.valueMax:bucket.valueTotal/bucket.count
 }));
};
function MiniChart({history, kind, target}: {history: ParticipantChartPoint[]; kind:'depth'|'bpm';target:[number,number]}) {
 const max=kind==='depth'?8:180;
 const plotTop=24;
 const plotBottom=216;
 const plotHeight=plotBottom-plotTop;
 const points=summarizeChart(history,kind).map(point=>`${point.time/TEAM_ROUND_SECONDS*552+38},${plotBottom-Math.min(max,Math.max(0,point.value))/max*plotHeight}`).join(' ');
 return <article className="tp-chart tp-panel"><div className="tp-chart-title"><h3>{kind==='depth'?'압박 깊이':'압박 속도'}</h3><span>{target.join('–')}{kind==='depth'?'cm':'회/분'}</span></div><svg role="img" aria-label={kind==='depth'?'30초 압박 깊이 그래프':'30초 압박 속도 그래프'} viewBox="0 0 610 250" preserveAspectRatio="none"><rect x="38" y={plotBottom-target[1]/max*plotHeight} width="552" height={(target[1]-target[0])/max*plotHeight} fill="#e2f5ef"/>{[0,0.5,1].map(n=><g key={n}><line x1="38" x2="590" y1={plotBottom-n*plotHeight} y2={plotBottom-n*plotHeight} stroke="#e7edf5"/><text x="29" y={plotBottom+5-n*plotHeight} textAnchor="end">{max*n}</text></g>)}<polyline points={points} fill="none" stroke={kind==='depth'?'#3182f6':'#0caa87'} strokeWidth="3" vectorEffect="non-scaling-stroke"/><text x="38" y="243">0초</text><text x="304" y="243" textAnchor="middle">15초</text><text x="590" y="243" textAnchor="end">30초</text></svg></article>;
}
const resultLabel = (result: TeamRoundResult) => result.participant
 ? `${result.participant.name} · ${result.participant.studentNumber}`
 : `${result.playerIndex+1}번 참가자`;
function ResultCard({result,rank}: {result:TeamRoundResult;rank:number|null}) {
 const label=resultLabel(result);
 return <article className="tp-result tp-panel"><div className="tp-result-heading"><span className="tp-person">{result.playerIndex+1}</span><h3>{label} {rank===null?'':`${rank}위`}</h3><span>{clock(result.elapsedSeconds)}</span></div><div className="tp-score"><strong>{number(result.score)}</strong><span>{result.score==null?'분석 대기':'점 / 100'}</span></div><dl className="tp-result-stats"><div><dt>평균 깊이</dt><dd>{number(result.avgDepth,1)} <small>cm</small></dd></div><div><dt>평균 속도</dt><dd>{number(result.avgBpm)} <small>회/분</small></dd></div><div><dt>복귀율</dt><dd>{number(result.avgRecoil,1)} <small>%</small></dd></div><div><dt>완료 압박</dt><dd>{result.compressionCount} <small>회</small></dd></div></dl><div className="tp-result-game">보너스 {(result.gamePoints??0).toLocaleString()} PT · 등급 {result.grade??'—'} · {result.xp??0} XP · 최대 {result.maxCombo??0}콤보</div><div className="tp-quality">유효 기록 {result.observedCount}회 · 누락 {result.missingCount}회</div></article>;
}
export function TeamPracticeScreen(p:TeamPracticeScreenProps) {
 const [showRegistration,setShowRegistration]=useState(false);
 const profile=CPR_PROFILES[p.victimType];
 const available=p.mode!=='live'||p.connected;
 const current=p.currentPlayerIndex+1;
 const last=p.results[p.results.length-1];
 const game=p.game;
 const combo=game?.combo??0;
 const multiplier=comboMultiplier(combo);
 const nextMilestone=combo<5?5:combo<10?10:combo<20?20:null;
 const started=p.reading.compressionCount>0;
 const currentParticipant=p.participants?.[p.currentPlayerIndex];
 const nextParticipant=p.participants?.[p.currentPlayerIndex+1];
 const saveLabel=p.saveStatus==='saving'?'저장 중…':p.saveStatus==='retrying'?'저장 재시도 중…':p.saveStatus==='failed'?'저장 실패':null;
 if(showRegistration) return <main className="tp-app tp-phase-registration"><header className="tp-header"><div className="tp-brand"><span className="tp-logo"><HeartPulse size={25}/></span><div><h1>LifePulse</h1><p>함께 배우는 CPR 실습</p></div></div><div className={`tp-connection ${available?'is-connected':''}`}><Radio size={15}/>{p.mode==='demo'?'시연 · 가상 센서':available?'실제 센서 연결됨':'센서 연결 대기'}</div></header><div className="tp-registration-wrapper">{p.onRegisterParticipants&&<ParticipantRegistrationForm playerCount={p.playerCount} onSubmit={pts=>{p.onRegisterParticipants?.(pts);setShowRegistration(false);p.onStart();}} onCancel={()=>setShowRegistration(false)}/>}</div><footer className="tp-footer">{p.mode==='demo'?'시연 모드 · 가상 센서 데이터':'교육용 프로토타입 · 실제 센서 측정'}<span>복귀율은 변위 기준 · 손 압력·손 위치·환기 미측정</span></footer></main>;
 if (p.phase === 'active') {
  const depthCue = p.reading.depthCm < profile.targetDepthCm.min ? '더 깊게 누르세요!' : '';
  const rateCue = p.reading.rate > 0 && p.reading.rate < 100 ? '속도를 더 올리세요!' : '';
  return <><span className="sr-only">{available ? '' : '센서 연결 대기 · 보너스 일시 정지'} {p.game?.xp ?? 0} XP <strong>{combo}</strong><span>콤보</span> 정확 +2 · 근접 +1 {depthCue} {rateCue} ×2 {p.game?.gamePoints ?? 0} 직전 완료 압박 기준</span><LivePracticeMonitor victimLabel={profile.label} targetDepth={profile.guideDepth} handPlacement={profile.handPlacement} depth={available ? p.reading.depthCm : 0} bpm={available ? p.reading.rate : 0} recoil={available ? p.reading.recoil : null} feedback={p.coach.action} feedbackTone={p.coach.severity === 'good' ? 'good' : p.coach.severity === 'urgent' || p.coach.severity === 'offline' ? 'urgent' : 'caution'} coach={p.coach} compressionCount={p.reading.compressionCount} properPercent={p.game?.score ?? 0} averageDepth={p.reading.depthCm} averageBpm={p.reading.rate} score={p.game?.gamePoints ?? 0} combo={available ? combo : 0} secondsRemaining={p.remainingSeconds} playerLabel={`${current}번 참가자`} rotationMessage={p.playerCount > 1 ? `다음 순서 · ${nextParticipant?.name ?? `${current + 1}번 참가자`}` : '개인 실습 진행 중'} history={(p.history ?? []).map(point => ({ time: `${point.time.toFixed(1)}초`, timestamp: Math.round(point.time * 1000), depth: point.depth, bpm: point.bpm }))} onFinish={p.onEndRound} /></>;
 }

 return <main className={`tp-app tp-phase-${p.phase}`}><header className="tp-header"><div className="tp-brand"><span className="tp-logo"><HeartPulse size={25}/></span><div><h1>LifePulse</h1><p>함께 배우는 CPR 실습</p></div></div><div className={`tp-connection ${available?'is-connected':''}`}><Radio size={15}/>{p.mode==='demo'?'시연 · 가상 센서':available?'실제 센서 연결됨':'센서 연결 대기'}</div></header>
 {p.phase==='setup'?<section className="tp-setup tp-panel"><div className="tp-setup-intro"><span className="tp-eyebrow">TEAM PRACTICE</span><h2>함께, 리듬을 이어가요.</h2><p>한 사람당 30초 · 차례대로 실습하고 각자의 결과를 확인해요.</p></div><div className="tp-setting"><h3>누구를 위한 실습인가요?</h3><div className="tp-victims">{(Object.keys(CPR_PROFILES) as VictimType[]).map(type=><button key={type} aria-pressed={p.victimType===type} onClick={()=>p.onConfigure(type,p.playerCount)}><strong>{CPR_PROFILES[type].label}</strong><span>{CPR_PROFILES[type].guideDepth}</span></button>)}</div></div><div className="tp-setting"><h3><Users size={17}/> 함께할 인원을 선택하세요</h3><div className="tp-people">{[1,2,3,4].map(n=><button key={n} aria-pressed={p.playerCount===n} onClick={()=>p.onConfigure(p.victimType,n)}>{n}명</button>)}</div></div><div className="tp-plan"><Timer size={19}/><span>1인 30초 × {p.playerCount}명</span><strong>총 {p.playerCount*30}초</strong></div><button className="tp-primary" onClick={()=>p.mode==='live'&&p.onRegisterParticipants?setShowRegistration(true):p.onStart()}>{p.playerCount}명 실습 시작하기 <span>→</span></button><a className="tp-guide" href="/guide">대상별 자세·손 모양 알아보기 ↗</a></section>
 :p.phase==='results'?<><section className="tp-summary"><div><span className="tp-eyebrow">PRACTICE COMPLETE</span><h2>모두 수고했어요!</h2><p>{profile.label} · {p.playerCount}명 실습 결과 · 아래로 스크롤해 깊이·속도 기록을 확인하세요.</p></div>{saveLabel&&<p className="tp-save-status" role="status">{saveLabel}</p>}<button className="tp-primary" onClick={p.onChangeSettings}>새 실습 시작</button><a className="tp-guide" href="/leaderboard" target="_blank" rel="noreferrer">🏆 전체 랭킹 보기 ↗</a></section><div className="tp-results-grid" style={{'--players':p.results.length} as React.CSSProperties}>{p.results.map(result=><ResultCard key={result.playerIndex} result={result} rank={result.score===null?null:1+p.results.filter(other=>other.score!==null && other.score>(result.score??0)).length}/>)}</div><div className="tp-result-note tp-panel"><strong>정확 +2 XP · 근접 +1 XP · 나머지 +0</strong><p>100점 환산 = 획득 XP ÷ (채점 압박 수 × 2) × 100. S≥90 · A≥80 · B≥70 · C≥60 · D&lt;60. 복귀율은 점수에서 제외해요. 보너스 PT는 이번 실습의 화면용 게임 점수이며, 저장·전체 랭킹은 100점 정확도 기준이에요.</p></div><section className="tp-result-history" aria-labelledby="result-history-title"><div className="tp-result-history-heading"><span className="tp-eyebrow">SESSION GRAPH</span><h2 id="result-history-title">참가자별 깊이·속도 기록</h2><p>각 참가자의 30초 실습 기록과 목표 구간을 비교해보세요.</p></div>{p.results.map(result=><article className="tp-result-history-group tp-panel" key={result.playerIndex}><h3><span className="tp-person">{result.playerIndex+1}</span>{resultLabel(result)}</h3><div className="tp-result-history-charts"><MiniChart history={result.history} kind="depth" target={[profile.targetDepthCm.min,profile.targetDepthCm.max]}/><MiniChart history={result.history} kind="bpm" target={[100,120]}/></div></article>)}</section></>
 :p.phase==='handoff'?<section className="tp-handoff tp-panel"><span className="tp-eyebrow">NEXT PLAYER</span><span className="tp-handoff-person">{current+1}</span><h2>{nextParticipant?`${nextParticipant.name}님, 준비됐나요?`:`${current+1}번 참가자, 준비됐나요?`}</h2><p>{currentParticipant?`${currentParticipant.name}님의 기록을 저장했어요.`:`${current}번 참가자의 기록을 저장했어요.`}<br/>센서를 원위치로 돌리고 다음 사람이 자리를 잡아주세요.</p>{last&&<div className="tp-last"><span>{currentParticipant?.name??`${current}번`} 결과</span><strong>{number(last.score)} {last.score==null?'분석 대기':'점'}</strong><span>압박 {last.compressionCount}회</span></div>}{saveLabel&&<p className="tp-save-status" role="status">{saveLabel}</p>}<button className="tp-primary" onClick={p.onNextPlayer}>준비 완료 · 다음 30초 시작 →</button><button className="tp-text-button" onClick={p.onChangeSettings}>새 실습 설정</button></section>
 :<><section className="tp-round tp-panel"><div><span className="tp-eyebrow">{profile.label} · {p.playerCount}명 순환 실습</span><h2><span className="tp-person">{current}</span>{currentParticipant?`${currentParticipant.name} · ${currentParticipant.studentNumber}`:`${current}번 참가자`} <small>{current} / {p.playerCount}</small></h2></div><div className="tp-timer"><span>남은 시간</span><strong>{clock(p.remainingSeconds)}</strong></div><div className="tp-next"><span>다음 순서</span><strong>{nextParticipant?nextParticipant.name:current<p.playerCount?`${current+1}번 참가자`:'전체 결과'}</strong></div><button className="tp-secondary" onClick={p.onEndRound}>현재 차례 종료</button><div className="tp-progress" role="progressbar" aria-label="현재 차례 진행률" aria-valuemin={0} aria-valuemax={TEAM_ROUND_SECONDS} aria-valuenow={p.elapsedSeconds}><span style={{width:`${Math.min(100,p.elapsedSeconds/TEAM_ROUND_SECONDS*100)}%`}}/></div></section><section className={`tp-gamebar ${available&&combo>0?'is-streak':''}`} aria-label="게임 점수"><div className="tp-game-total"><span>보너스 게임 점수</span><strong>{(game?.gamePoints??0).toLocaleString()} <small>PT</small></strong><p>정확도 {game?.score==null?'채점 대기':`${game.score}점`} · 등급 {game?.grade??'—'} · {game?.xp??0} XP</p></div><div className="tp-combo"><div key={`${available}-${combo}`} className="tp-combo-number"><strong>{available?combo:'—'}</strong><span>콤보</span><b>×{available?multiplier:'—'}</b></div><p>{!available?'연결 대기 · 보너스 일시 정지':!started?'깊이 + 속도를 맞춰 콤보에 도전하세요!':combo===0?'다시 도전! 정확한 압박부터 콤보가 시작돼요':nextMilestone?`${nextMilestone-combo}회 더 정확하게! ×${multiplier*2} 보너스까지`:'최고 배수 달성! 이 리듬을 이어가세요'}</p><div className="tp-combo-track" aria-hidden="true"><span style={{width:`${Math.min(100,combo/20*100)}%`}}/></div></div><div className="tp-game-rule"><strong>정확 +20 PT · 근접 +10 PT</strong><span>5콤보 ×2 · 10콤보 ×4 · 20콤보 ×8</span><span>정확한 압박에 배수 적용 · 근접/미흡은 콤보 초기화</span></div></section><div className="tp-live"><section className="tp-metrics"><article className="tp-metric tp-panel"><h3><ArrowDown size={18}/>현재 압박 깊이</h3><div><strong>{available?number(p.reading.depthCm,1):'—'}</strong><span>cm</span></div><p>목표 {profile.guideDepth} · 직전 완료 압박 기준</p></article><article className="tp-metric tp-panel"><h3><Activity size={18}/>현재 압박 속도</h3><div><strong>{available?number(p.reading.rate):'—'}</strong><span>회/분</span></div><p>목표 100–120회/분</p></article><article className="tp-metric tp-panel tp-recoil"><h3><RotateCcw size={18}/>이완 복귀율</h3><div><strong>{available?number(p.reading.recoil,1):'—'}</strong><span>%</span></div><p>{!available||p.reading.recoil==null?'측정 대기':'직전 압박 · 변위 기준'}</p></article></section><CompressionBurst eventCount={game?.eventCount??p.reading.compressionCount} available={available} combo={combo} depth={game?.assessmentDepth??null} bpm={game?.assessmentBpm??p.reading.rate} victimType={p.victimType}/></div><section className="tp-roster" aria-label="참가자 진행 현황">{Array.from({length:p.playerCount},(_,index)=>{const result=p.results.find(r=>r.playerIndex===index);const pName=p.participants?.[index]?.name;return <article key={index} className={index===p.currentPlayerIndex?'is-current':''}><span className="tp-person">{index+1}</span><div><strong>{pName??`${index+1}번 참가자`}</strong><p>{result?`${number(result.score)}점 · ${result.compressionCount}회`:index===p.currentPlayerIndex?`진행 중 · ${p.reading.compressionCount}회`:'대기 중'}</p></div></article>;})}</section></>}
 <footer className="tp-footer">{p.mode==='demo'?'시연 모드 · 가상 센서 데이터':'교육용 프로토타입 · 실제 센서 측정'}<span>복귀율은 변위 기준 · 손 압력·손 위치·환기 미측정</span></footer></main>;
}
