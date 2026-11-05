import { useEffect, useRef, useState } from 'react';
import { Heart, HeartPulse, Sparkles } from 'lucide-react';
import { VoiceCoach } from './VoiceCoach';
import type { VictimType } from '../utils/cprGuidance';
import { CPR_PROFILES } from '../utils/cprGuidance';
import { comboMultiplier, metricCue } from '../utils/practiceGame';

interface BurstProps {
  eventCount: number;
  available: boolean;
  combo: number;
  depth: number | null;
  bpm: number | null;
  victimType: VictimType;
}

// Show one visual cue per three recorded completions; sample updates never trigger it.
export function CompressionBurst({ eventCount, available, combo, depth, bpm, victimType }: BurstProps) {
  const previous = useRef(eventCount);
  const [burst, setBurst] = useState<BurstProps | null>(null);
  useEffect(() => {
    const changed = Math.floor(eventCount / 3) > Math.floor(previous.current / 3);
    previous.current = eventCount;
    if (!available || eventCount === 0) { setBurst(null); return; }
    if (changed) setBurst({ eventCount, available, combo, depth, bpm, victimType });
  }, [eventCount, available, combo, depth, bpm, victimType]);

  const profile = CPR_PROFILES[victimType];
  const voiceDepth = metricCue(depth, profile.targetDepthCm.min, profile.targetDepthCm.max, 'depth', available, eventCount > 0);
  const voiceRate = metricCue(bpm, 100, 120, 'rate', available, eventCount > 0);
  const voiceNotice = !available ? { text: '센서 연결을 확인해주세요.', kind: 'offline' as const }
    : eventCount === 0 ? { text: '압박을 시작하세요.', kind: 'waiting' as const }
    : voiceDepth.tone === 'adjust' ? { text: voiceDepth.text, kind: 'correction' as const }
    : voiceRate.tone === 'adjust' ? { text: voiceRate.text, kind: 'correction' as const }
    : voiceRate.tone === 'waiting' || voiceDepth.tone === 'waiting' ? { text: '속도를 측정하고 있어요.', kind: 'waiting' as const }
    : { text: '좋아요. 지금 깊이와 속도를 유지하세요.', kind: 'good' as const };
  const good = burst !== null && burst.combo > 0;
  const multiplier = comboMultiplier(burst?.combo ?? 0);
  const milestone = good && [5, 10, 20].includes(burst.combo);
  return <section className={`tp-burst-stage ${burst && available ? 'has-feedback' : ''}`} aria-label="압박별 게임 피드백">
    <VoiceCoach notice={voiceNotice} eventCount={eventCount}/>
    <span className="tp-pulse-label"><HeartPulse size={16}/> 실시간 CPR 코치</span>
    <div className="tp-coach-feedback" aria-live="polite">
      <aside className={`tp-coach-metric tp-coach-depth tp-coach-${voiceDepth.tone}`}>
        <span>DEPTH COACH</span>
        <strong>{voiceDepth.text}</strong>
        <small>{available && depth !== null && eventCount > 0 ? `직전 압박 ${depth.toFixed(1)}cm` : `목표 ${profile.guideDepth}`}</small>
      </aside>
      <div className={`tp-neon-core ${burst && available ? 'is-beating' : ''}`} aria-hidden="true">
        <i className="tp-neon-halo"/>
        <svg className="tp-neon-pulse" viewBox="0 0 470 150" role="presentation">
          <path className="tp-neon-line" d="M8 78h75l20-26 22 61 28-96 28 118 25-72 20 15h43"/>
          <path className="tp-neon-heart" d="M327 122c-39-27-66-51-66-79 0-25 31-35 48-15l18 21 18-21c17-20 48-10 48 15 0 28-27 52-66 79Z"/>
          <path className="tp-neon-line" d="M226 78h35m132 0h69"/>
        </svg>
        <span className="tp-neon-caption">LIFEPULSE</span>
      </div>
      <aside className={`tp-coach-metric tp-coach-rate tp-coach-${voiceRate.tone}`}>
        <span>RHYTHM COACH</span>
        <strong>{voiceRate.text}</strong>
        <small>{available && bpm !== null && bpm > 0 && eventCount > 0 ? `직전 속도 ${Math.round(bpm)}회/분` : '목표 100–120회/분'}</small>
      </aside>
    </div>
    {burst && available && <div key={`hearts-${burst.eventCount}`} className="tp-floating-hearts" aria-hidden="true">{['left','right'].map(side=><div key={side} className={`tp-heart-side tp-heart-${side}`}><Heart/><Heart/><Heart/><Heart/><Heart/></div>)}</div>}
    <div className="tp-burst-idle"><span>{!available ? '센서 연결을 기다리고 있어요' : eventCount === 0 ? '압박을 시작하면 코치가 실시간으로 안내해요' : '깊이와 리듬을 맞춰 콤보를 이어가세요'}</span></div>
    {burst && available && <div key={burst.eventCount} className={`tp-hit ${good ? 'tp-hit-perfect' : 'tp-hit-adjust'} ${milestone ? 'tp-hit-milestone' : ''}`}>
      <div className="tp-hit-ring" aria-hidden="true"/>
      <span className="tp-hit-verdict">{good ? <><Sparkles size={20}/> {milestone ? 'LEVEL UP!' : 'PERFECT!'}</> : burst.bpm === null || burst.bpm <= 0 ? 'GET READY' : 'TRY AGAIN'}</span>
      {good ? <><div className="tp-hit-combo"><strong>{burst.combo}</strong><span>COMBO</span></div><p className="tp-hit-message">{milestone ? `보너스 ×${multiplier} 달성!` : '좋아요! 이 리듬 그대로!'}</p><b className="tp-hit-points">+{20 * multiplier} PT <span>×{multiplier}</span></b></> : <><h2 className="tp-hit-correction">다시 도전!</h2><p className="tp-hit-message">{burst.bpm === null || burst.bpm <= 0 ? '속도가 확인되면 콤보 시작!' : '좌우 코치에 맞춰 다음 압박!'}</p></>}
    </div>}
  </section>;
}
