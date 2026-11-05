import type { TeamEvent } from '../live/teamSession';
import { CPR_PROFILES, type VictimType } from './cprGuidance';

export const comboMultiplier = (combo: number) => combo >= 20 ? 8 : combo >= 10 ? 4 : combo >= 5 ? 2 : 1;

export type PracticeJudgement = 'miss' | 'bad' | 'good' | 'great' | 'perfect';

export interface PracticeAssessment {
  judgement: PracticeJudgement;
  matchPercent: number;
  depthScore: number;
  rateScore: number;
  basePoints: 0 | 5 | 10 | 15 | 20;
  combo: number;
  recoilLimited: boolean;
}

// Measurements are compared at the precision shown in the supplied tables.
export function assessPracticeCompression(
  event: Pick<TeamEvent, 'depth' | 'bpm' | 'recoil'>,
  victimType: VictimType,
  currentCombo = 0,
): PracticeAssessment {
  const target = CPR_PROFILES[victimType].targetDepthCm;
  const depth = Math.round(event.depth * 100) / 100;
  const bpm = event.bpm === null ? 0 : Math.round(event.bpm);
  const depthTier = !Number.isFinite(depth) || depth <= 0 ? 0
    : depth >= target.min && depth <= target.max ? 4
    : depth >= Math.round(target.min * .85 * 100) / 100 && depth <= Math.round(target.max * 1.15 * 100) / 100 ? 3
    : depth >= Math.round(target.min * .70 * 100) / 100 && depth <= Math.round(target.max * 1.30 * 100) / 100 ? 2
    : depth >= Math.round(target.min * .55 * 100) / 100 && depth <= Math.round(target.max * 1.45 * 100) / 100 ? 1 : 0;
  const rateTier = !Number.isFinite(bpm) ? 0
    : bpm >= 100 && bpm <= 120 ? 4
    : bpm >= 85 && bpm <= 138 ? 3
    : bpm >= 70 && bpm <= 156 ? 2
    : bpm >= 55 && bpm <= 174 ? 1 : 0;
  const scores = [0, 25, 50, 75, 100];
  const depthScore = scores[depthTier];
  const rateScore = scores[rateTier];
  const matchPercent = Math.min(depthScore, rateScore);
  const judgement = (['miss', 'bad', 'good', 'great', 'perfect'] as const)[Math.min(depthTier, rateTier)];
  const recoilLimited = false; // Recoil is a live coaching metric, not a grading input.

  const basePoints = ({ miss: 0, bad: 5, good: 10, great: 15, perfect: 20 } as const)[judgement];
  const combo = judgement === 'miss' || judgement === 'bad'
    ? 0
    : judgement === 'good'
      ? currentCombo
      : currentCombo + 1;
  return { judgement, matchPercent, depthScore, rateScore, basePoints, combo, recoilLimited };
}

// Presentation-only bonus. Sensor processing stays unchanged.
export function practiceBonus(events: TeamEvent[], victimType: VictimType) {
  let combo = 0, maxCombo = 0, gamePoints = 0;
  let lastAssessment: PracticeAssessment | null = null;
  for (const event of events) {
    const assessment = assessPracticeCompression(event, victimType, combo);
    combo = assessment.combo;
    maxCombo = Math.max(maxCombo, combo);
    gamePoints += assessment.basePoints * comboMultiplier(combo);
    lastAssessment = assessment;
  }
  return {
    eventCount: events.length,
    assessmentBpm: events.at(-1)?.bpm ?? null,
    assessmentDepth: events.at(-1)?.depth ?? null,
    gamePoints,
    combo,
    maxCombo,
    multiplier: comboMultiplier(combo),
    lastAssessment,
  };
}

export function metricCue(value: number | null, min: number, max: number, kind: 'depth' | 'rate', available: boolean, started: boolean) {
  if (!available) return { tone: 'waiting', text: '센서 연결을 확인하세요' };
  if (!started || value === null || !Number.isFinite(value) || (kind === 'rate' && value <= 0)) return { tone: 'waiting', text: kind === 'depth' ? '압박을 시작하세요' : '속도를 측정하고 있어요' };
  if (value < min) return { tone: 'adjust', text: kind === 'depth' ? '더 깊게 누르세요!' : '속도를 더 올리세요!' };
  if (value > max) return { tone: 'adjust', text: kind === 'depth' ? '조금 얕게 누르세요!' : '속도를 조금 낮추세요!' };
  return { tone: 'good', text: kind === 'depth' ? '좋아요! 이 깊이를 유지하세요' : '좋아요! 이 속도를 유지하세요' };
}

/** Display-only preview: retain the last completed compression through release.
 * Before its rate exists, label the preview as depth-only; never award points.
 */
export function practiceDisplayAssessment(
 history: {depth:number;bpm:number}[], depth: number, bpm: number,
 victimType: VictimType, completed: PracticeAssessment | null = null,
 completedDepth: number | null = null, completedBpm: number | null = null,
) {
 if(completed && completedBpm!==null && completedBpm>0) return {assessment:completed,depth:completedDepth??depth,depthOnly:false};
 const peak=completedDepth??Math.max(depth,...history.map(point=>point.depth));
 if(completed && bpm<=0) {
  const preview=assessPracticeCompression({depth:completedDepth??peak,bpm:110,recoil:null},victimType);
  return {assessment:preview,depth:completedDepth??peak,depthOnly:true};
 }
 const preview=assessPracticeCompression({depth:peak,bpm:bpm>0?bpm:110,recoil:null},victimType);
 return {assessment:preview,depth:peak,depthOnly:bpm<=0};
}
