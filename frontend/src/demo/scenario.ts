export type MonitoringStatus = 'normal' | 'caution' | 'urgent';

export interface ParticipantReading {
  depthCm: number;
  rate: number;
  recoil: number;
  score: number;
  compressionCount: number;
  feedback: string;
  status: MonitoringStatus;
  phaseLabel: string;
}

export interface LearnerMetrics {
  depthMm: number;
  rate: number;
  recoil: number;
  score: number;
  aedUsed: boolean;
}

export interface DemoLearner {
  id: string;
  name: string;
  station: string;
  metrics: LearnerMetrics;
  status: MonitoringStatus;
}

export interface DemoAlert {
  id: string;
  learnerId: string;
  learnerName: string;
  level: Exclude<MonitoringStatus, 'normal'>;
  message: string;
  time: string;
}

export interface DemoSession {
  name: string;
  location: string;
  instructor: string;
  learners: DemoLearner[];
  alerts: DemoAlert[];
  scoreHistory: Array<{ time: string; score: number }>;
}

export interface DemoPhase extends ParticipantReading {
  id: 'normal' | 'shallow' | 'fast' | 'recoil' | 'urgent' | 'recovery';
}

const PHASE_DURATION_MS = 12_000;
const CYCLE_DURATION_MS = PHASE_DURATION_MS * 6;

const PHASES: readonly DemoPhase[] = [
  {
    id: 'normal', depthCm: 5.4, rate: 110, recoil: 96, score: 92,
    compressionCount: 34, feedback: '좋습니다. 올바른 압박을 유지하세요',
    status: 'normal', phaseLabel: '정확한 압박 유지'
  },
  {
    id: 'shallow', depthCm: 4.3, rate: 108, recoil: 92, score: 73,
    compressionCount: 56, feedback: '조금 더 깊게 압박하세요',
    status: 'caution', phaseLabel: '압박 깊이 교정'
  },
  {
    id: 'fast', depthCm: 5.3, rate: 132, recoil: 88, score: 67,
    compressionCount: 82, feedback: '속도를 조금 낮추세요',
    status: 'caution', phaseLabel: '압박 속도 교정'
  },
  {
    id: 'recoil', depthCm: 5.2, rate: 114, recoil: 74, score: 58,
    compressionCount: 104, feedback: '가슴을 완전히 이완하세요',
    status: 'caution', phaseLabel: '충분한 이완 필요'
  },
  {
    id: 'urgent', depthCm: 4.1, rate: 142, recoil: 70, score: 42,
    compressionCount: 129, feedback: '깊이와 속도를 즉시 교정하세요',
    status: 'urgent', phaseLabel: '강사 확인 필요'
  },
  {
    id: 'recovery', depthCm: 5.2, rate: 108, recoil: 94, score: 86,
    compressionCount: 151, feedback: '교정되었습니다. 이 리듬을 유지하세요',
    status: 'normal', phaseLabel: '정상 범위 회복'
  }
] as const;

const LEARNER_NAMES = ['김서준', '이지우', '박도윤', '최하은', '정예준', '강수아', '조민준', '윤서연'];

export function getDemoPhase(elapsedMs: number): DemoPhase {
  const normalized = ((elapsedMs % CYCLE_DURATION_MS) + CYCLE_DURATION_MS) % CYCLE_DURATION_MS;
  return PHASES[Math.floor(normalized / PHASE_DURATION_MS)];
}

export function getParticipantReading(elapsedMs: number): ParticipantReading {
  const phase = getDemoPhase(elapsedMs);
  return {
    depthCm: phase.depthCm,
    rate: phase.rate,
    recoil: phase.recoil,
    score: phase.score,
    compressionCount: phase.compressionCount + Math.floor((elapsedMs % PHASE_DURATION_MS) / 550),
    feedback: phase.feedback,
    status: phase.status,
    phaseLabel: phase.phaseLabel
  };
}

export function getStatusFromMetrics(metrics: Omit<LearnerMetrics, 'aedUsed'>): MonitoringStatus {
  const criticalCount = [
    metrics.depthMm < 43 || metrics.depthMm > 65,
    metrics.rate < 85 || metrics.rate > 135,
    metrics.recoil < 78
  ].filter(Boolean).length;

  if (metrics.score < 55 || criticalCount >= 2) return 'urgent';
  if (metrics.score < 75 || criticalCount >= 1) return 'caution';
  return 'normal';
}

function metricsForLearner(index: number, elapsedMs: number): LearnerMetrics {
  if (index === 0) {
    const reading = getParticipantReading(elapsedMs);
    return {
      depthMm: reading.depthCm * 10,
      rate: reading.rate,
      recoil: reading.recoil,
      score: reading.score,
      aedUsed: elapsedMs % CYCLE_DURATION_MS >= 30_000
    };
  }

  const phase = getDemoPhase(elapsedMs + index * 7_000);
  const depthOffset = ((index % 3) - 1) * 0.4;
  const rateOffset = ((index % 4) - 1.5) * 2;
  return {
    depthMm: Math.round((phase.depthCm * 10 + depthOffset) * 10) / 10,
    rate: Math.round(phase.rate + rateOffset),
    recoil: Math.max(65, Math.min(98, phase.recoil + (index % 2 === 0 ? 2 : -2))),
    score: Math.max(35, Math.min(98, phase.score + (index % 3) * 3)),
    aedUsed: index % 3 === 0
  };
}

function alertMessage(metrics: LearnerMetrics): string {
  if (metrics.depthMm < 43) return `압박 깊이 ${metrics.depthMm.toFixed(1)}mm - 더 깊은 압박이 필요합니다.`;
  if (metrics.rate > 135) return `압박 속도 ${metrics.rate}회/분 - 즉시 속도를 낮춰주세요.`;
  if (metrics.recoil < 78) return `압박 이완 ${metrics.recoil}% - 완전한 이완이 필요합니다.`;
  return '권장 범위를 벗어난 수행 지표가 감지되었습니다.';
}

export function buildDemoSession(elapsedMs: number): DemoSession {
  const learners = LEARNER_NAMES.map((name, index) => {
    const metrics = metricsForLearner(index, elapsedMs);
    return {
      id: `learner-${index + 1}`,
      name,
      station: `스테이션 ${String.fromCharCode(65 + index)}`,
      metrics,
      status: getStatusFromMetrics(metrics)
    };
  });

  const alerts = learners
    .filter((learner) => learner.status !== 'normal')
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'urgent' ? -1 : 1))
    .map((learner, index): DemoAlert => ({
      id: `${learner.id}-${getDemoPhase(elapsedMs).id}-${index}`,
      learnerId: learner.id,
      learnerName: learner.name,
      level: learner.status as DemoAlert['level'],
      message: alertMessage(learner.metrics),
      time: new Date(9 * 60 * 60 * 1000 + elapsedMs - index * 20_000).toISOString().slice(11, 19)
    }));

  const activeScore = Math.round(learners.reduce((sum, learner) => sum + learner.metrics.score, 0) / learners.length);
  const scoreHistory = Array.from({ length: 7 }, (_, index) => ({
    time: `${index * 10}분`,
    score: Math.max(55, Math.min(94, activeScore - 5 + index * 2 - (index % 2) * 3))
  }));

  return {
    name: 'CPR 기본과정 · 오후 실습',
    location: '본관 3층 · 302호',
    instructor: '한지민 강사',
    learners,
    alerts,
    scoreHistory
  };
}
