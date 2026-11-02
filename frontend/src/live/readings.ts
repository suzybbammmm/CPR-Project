import { getStatusFromMetrics, ParticipantReading } from '../demo/scenario';
import { CPR_PROFILES, VictimType } from '../utils/cprGuidance';

function feedbackFor(depthCm: number, rate: number, victimType: VictimType): Pick<ParticipantReading, 'feedback' | 'phaseLabel'> {
  const target = CPR_PROFILES[victimType].targetDepthCm;
  if (depthCm < target.min) return { feedback: '조금 더 깊게 압박하세요', phaseLabel: '압박 깊이 교정' };
  if (depthCm > target.max) return { feedback: '압박 깊이를 조금 줄이세요', phaseLabel: '압박 깊이 교정' };
  if (rate < 100) return { feedback: '압박 속도를 높이세요', phaseLabel: '압박 속도 교정' };
  if (rate > 120) return { feedback: '속도를 조금 낮추세요', phaseLabel: '압박 속도 교정' };
  return { feedback: '좋습니다. 올바른 압박을 유지하세요', phaseLabel: '정확한 압박 유지' };
}

export function buildLiveParticipantReading(
  data: { depth: number; bpm: number; compressionCount?: number; recoilPercent?: number | null; compressionPeakCm?: number } | null,
  elapsedMs: number,
  connected: boolean,
  victimType: VictimType = 'adult'
): ParticipantReading {
  if (!connected || !data) {
    return {
      depthCm: 0,
      rate: 0,
      recoil: null,
      score: 0,
      compressionCount: 0,
      feedback: '센서 연결 후 압박을 시작하세요',
      status: 'urgent',
      phaseLabel: '센서 연결 대기'
    };
  }

  const depthCm = Number(data.depth.toFixed(1));
  const rate = Math.round(data.bpm);
  const recoil = typeof data.recoilPercent === 'number' && Number.isFinite(data.recoilPercent) && data.recoilPercent >= 0 && data.recoilPercent <= 100 ? Math.round(data.recoilPercent) : null;
  const assessmentDepth = (data.compressionCount ?? 0) > 0 && typeof data.compressionPeakCm === 'number' ? data.compressionPeakCm : depthCm;
  const target = CPR_PROFILES[victimType].targetDepthCm;
  const depthPenalty = assessmentDepth < target.min ? (target.min - assessmentDepth) * 18 : assessmentDepth > target.max ? (assessmentDepth - target.max) * 18 : 0;
  const ratePenalty = rate < 100 ? (100 - rate) * 0.8 : rate > 120 ? (rate - 120) * 0.8 : 0;
  const score = Math.max(0, Math.round(100 - depthPenalty - ratePenalty));
  const status = getStatusFromMetrics({ depthMm: assessmentDepth * 10, rate, recoil: null, score });

  return {
    depthCm,
    rate,
    recoil,
    score,
    compressionCount: data.compressionCount ?? 0,
    status,
    ...feedbackFor(assessmentDepth, rate, victimType)
  };
}
