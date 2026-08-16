import { getStatusFromMetrics, ParticipantReading } from '../demo/scenario';

function feedbackFor(depthCm: number, rate: number): Pick<ParticipantReading, 'feedback' | 'phaseLabel'> {
  if (depthCm < 5) return { feedback: '조금 더 깊게 압박하세요', phaseLabel: '압박 깊이 교정' };
  if (depthCm > 6) return { feedback: '압박 깊이를 조금 줄이세요', phaseLabel: '압박 깊이 교정' };
  if (rate < 100) return { feedback: '압박 속도를 높이세요', phaseLabel: '압박 속도 교정' };
  if (rate > 120) return { feedback: '속도를 조금 낮추세요', phaseLabel: '압박 속도 교정' };
  return { feedback: '좋습니다. 올바른 압박을 유지하세요', phaseLabel: '정확한 압박 유지' };
}

export function buildLiveParticipantReading(
  data: { depth: number; bpm: number } | null,
  elapsedMs: number,
  connected: boolean
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
  const depthPenalty = depthCm < 5 ? (5 - depthCm) * 18 : depthCm > 6 ? (depthCm - 6) * 18 : 0;
  const ratePenalty = rate < 100 ? (100 - rate) * 0.8 : rate > 120 ? (rate - 120) * 0.8 : 0;
  const score = Math.max(0, Math.round(100 - depthPenalty - ratePenalty));
  const status = getStatusFromMetrics({ depthMm: depthCm * 10, rate, recoil: null, score });

  return {
    depthCm,
    rate,
    recoil: null,
    score,
    compressionCount: Math.max(0, Math.round((elapsedMs / 60_000) * rate)),
    status,
    ...feedbackFor(depthCm, rate)
  };
}
