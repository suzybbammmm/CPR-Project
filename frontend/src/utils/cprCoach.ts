import { DataPoint } from '../types/game.types';
import { CPR_PROFILES, VictimType } from './cprGuidance';

export type CoachSeverity = 'offline' | 'urgent' | 'caution' | 'good';

export interface LiveCoachFeedback {
  severity: CoachSeverity;
  title: string;
  action: string;
  rationale: string;
  criterion: string;
}

export interface LiveCoachInput {
  sensorOnline: boolean;
  victimType: VictimType;
  depth: number;
  bpm: number;
  compressionCount: number;
}

export interface CprSessionAnalysis {
  insufficientData: boolean;
  totalCompressions: number;
  depthProperPercent: number;
  rateProperPercent: number;
  properPercent: number;
  averageDepth: number;
  averageBpm: number;
  tooShallowCount: number;
  tooDeepCount: number;
  tooSlowCount: number;
  tooFastCount: number;
  firstHalfDepth: number;
  secondHalfDepth: number;
  firstHalfBpm: number;
  secondHalfBpm: number;
  strength: string;
  priority: string;
  nextGoal: string;
  summary: string;
}

const RATE_MIN = 100;
const RATE_MAX = 120;

function percentage(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

function average(points: DataPoint[]): { depth: number; bpm: number } {
  if (points.length === 0) return { depth: 0, bpm: 0 };
  const total = points.reduce((sum, point) => ({ depth: sum.depth + point.depth, bpm: sum.bpm + point.bpm }), { depth: 0, bpm: 0 });
  return { depth: Number((total.depth / points.length).toFixed(1)), bpm: Math.round(total.bpm / points.length) };
}

function targetLabel(victimType: VictimType): string {
  return `${CPR_PROFILES[victimType].label} 권장 깊이 ${CPR_PROFILES[victimType].guideDepth} · 속도 ${RATE_MIN}–${RATE_MAX}회/분`;
}

export function getLiveCoachFeedback(input: LiveCoachInput): LiveCoachFeedback {
  const profile = CPR_PROFILES[input.victimType];
  const criterion = targetLabel(input.victimType);
  if (!input.sensorOnline) {
    return { severity: 'offline', title: '센서 대기', action: '센서 데이터를 기다리고 있습니다.', rationale: 'ESP32 연결 또는 최근 측정값을 확인하세요.', criterion };
  }
  if (input.compressionCount === 0 && input.depth <= 0.2 && input.bpm <= 0) {
    return { severity: 'caution', title: '압박 시작', action: '압박을 시작하세요.', rationale: '첫 두 번의 완료 압박 후 속도를 측정합니다.', criterion };
  }

  const shallowBy = Math.max(0, profile.targetDepthCm.min - input.depth);
  const deepBy = Math.max(0, input.depth - profile.targetDepthCm.max);
  const slowBy = input.bpm > 0 ? Math.max(0, RATE_MIN - input.bpm) : 0;
  const fastBy = Math.max(0, input.bpm - RATE_MAX);
  const depthIssue = shallowBy > 0 || deepBy > 0;
  const rateIssue = slowBy > 0 || fastBy > 0;

  if (depthIssue) {
    const depthDeviation = Math.max(shallowBy, deepBy);
    const rateDeviation = Math.max(slowBy, fastBy) / 20;
    const depthPrimary = !rateIssue || depthDeviation >= rateDeviation;
    if (depthPrimary) {
      const action = shallowBy > 0 ? '깊이를 더 확보하세요.' : '압박 깊이를 줄이세요.';
      const otherIssue = rateIssue ? ` 속도도 ${slowBy > 0 ? '조금 높여' : '조금 낮춰'}야 합니다.` : '';
      return { severity: 'caution', title: '깊이 교정 필요', action, rationale: `현재 ${input.depth.toFixed(1)}cm입니다.${otherIssue}`, criterion };
    }
  }

  if (rateIssue) {
    const action = slowBy > 0 ? '속도를 조금 높이세요.' : '속도를 조금 낮추세요.';
    const depthNote = depthIssue ? ` 깊이도 ${shallowBy > 0 ? '조금 더 확보' : '조금 줄여'}야 합니다.` : ' 깊이는 목표 범위 안입니다.';
    return { severity: 'caution', title: '속도 교정 필요', action, rationale: `현재 ${Math.round(input.bpm)}회/분입니다.${depthNote}`, criterion };
  }

  return { severity: 'good', title: '정상 범위', action: '좋습니다. 현재 리듬을 유지하세요.', rationale: `깊이 ${input.depth.toFixed(1)}cm와 속도 ${Math.round(input.bpm)}회/분이 모두 목표 범위 안입니다.`, criterion };
}

export function analyzeCprSession(peaks: DataPoint[], victimType: VictimType): CprSessionAnalysis {
  const profile = CPR_PROFILES[victimType];
  const total = peaks.length;
  if (total === 0) {
    return {
      insufficientData: true, totalCompressions: 0, depthProperPercent: 0, rateProperPercent: 0, properPercent: 0,
      averageDepth: 0, averageBpm: 0, tooShallowCount: 0, tooDeepCount: 0, tooSlowCount: 0, tooFastCount: 0,
      firstHalfDepth: 0, secondHalfDepth: 0, firstHalfBpm: 0, secondHalfBpm: 0,
      strength: '완료 압박 데이터가 아직 없습니다.', priority: '압박을 시작한 뒤 결과를 다시 확인하세요.',
      nextGoal: `다음 라운드에서 ${profile.guideDepth} 깊이와 ${RATE_MIN}–${RATE_MAX}회/분을 유지해보세요.`,
      summary: '분석할 완료 압박 데이터가 부족합니다.'
    };
  }

  const depthGood = peaks.filter(point => point.depth >= profile.targetDepthCm.min && point.depth <= profile.targetDepthCm.max);
  const rateGood = peaks.filter(point => point.bpm >= RATE_MIN && point.bpm <= RATE_MAX);
  const proper = peaks.filter(point => point.depth >= profile.targetDepthCm.min && point.depth <= profile.targetDepthCm.max && point.bpm >= RATE_MIN && point.bpm <= RATE_MAX);
  const tooShallowCount = peaks.filter(point => point.depth < profile.targetDepthCm.min).length;
  const tooDeepCount = peaks.filter(point => point.depth > profile.targetDepthCm.max).length;
  const tooSlowCount = peaks.filter(point => point.bpm > 0 && point.bpm < RATE_MIN).length;
  const tooFastCount = peaks.filter(point => point.bpm > RATE_MAX).length;
  const midpoint = Math.ceil(total / 2);
  const first = average(peaks.slice(0, midpoint));
  const second = average(peaks.slice(midpoint));
  const totals = average(peaks);
  const issueCounts = [
    { type: 'shallow', count: tooShallowCount },
    { type: 'deep', count: tooDeepCount },
    { type: 'slow', count: tooSlowCount },
    { type: 'fast', count: tooFastCount }
  ].sort((left, right) => right.count - left.count);
  const primary = issueCounts[0];
  const labels: Record<string, string> = { shallow: '압박 깊이가 부족한 경우', deep: '압박 깊이가 과도한 경우', slow: '압박 속도가 느린 경우', fast: '압박 속도가 빠른 경우' };
  const depthPercent = percentage(depthGood.length, total);
  const ratePercent = percentage(rateGood.length, total);
  const properPercent = percentage(proper.length, total);
  const strength = depthPercent >= ratePercent
    ? `깊이 적정 비율이 ${depthPercent}%였습니다.`
    : `속도 적정 비율이 ${ratePercent}%였습니다.`;
  const priority = primary.count === 0
    ? '깊이와 속도를 모두 안정적으로 유지했습니다.'
    : `${labels[primary.type]} ${primary.count}회가 가장 큰 개선 항목입니다.`;
  const nextGoal = primary.type === 'shallow' ? `다음 라운드에서는 ${profile.guideDepth} 깊이를 우선 맞춰보세요.`
    : primary.type === 'deep' ? `다음 라운드에서는 ${profile.guideDepth}를 넘지 않도록 압박 깊이를 조절해보세요.`
      : primary.type === 'slow' ? `다음 라운드에서는 ${RATE_MIN}–${RATE_MAX}회/분 리듬을 조금 더 빠르게 유지해보세요.`
        : primary.type === 'fast' ? `다음 라운드에서는 ${RATE_MIN}–${RATE_MAX}회/분보다 서두르지 않도록 리듬을 낮춰보세요.`
          : '다음 라운드에서도 현재 깊이와 속도를 유지해보세요.';
  const trend = total < 2 ? '압박 수가 적어 전후반 추세는 계산하지 않았습니다.'
    : `전반부 평균 ${first.depth.toFixed(1)}cm·${first.bpm}회/분, 후반부 평균 ${second.depth.toFixed(1)}cm·${second.bpm}회/분입니다.`;

  return {
    insufficientData: false, totalCompressions: total, depthProperPercent: depthPercent, rateProperPercent: ratePercent, properPercent,
    averageDepth: totals.depth, averageBpm: totals.bpm, tooShallowCount, tooDeepCount, tooSlowCount, tooFastCount,
    firstHalfDepth: first.depth, secondHalfDepth: second.depth, firstHalfBpm: first.bpm, secondHalfBpm: second.bpm,
    strength, priority, nextGoal, summary: `${total}회의 완료 압박 중 깊이·속도가 모두 적정 범위인 압박은 ${properPercent}%입니다. ${trend}`
  };
}
