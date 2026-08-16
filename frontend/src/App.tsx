import React, { useEffect, useMemo, useState } from 'react';
import { getRuntimeConfig, RuntimeMode } from './config/runtime';
import {
  buildDemoSession,
  DemoSession,
  getParticipantReading,
  getStatusFromMetrics,
  ParticipantReading
} from './demo/scenario';
import { useWebSocket } from './hooks/useWebSocket';
import { InstructorDashboardScreen } from './pages/InstructorDashboardScreen';
import { ParticipantDisplayReading, ParticipantSessionScreen } from './pages/ParticipantSessionScreen';
import { RoleLauncher } from './pages/RoleLauncher';

function useElapsedMilliseconds(intervalMs = 500): number {
  const [startedAt] = useState(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const update = () => setElapsedMs(Date.now() - startedAt);
    update();
    const interval = window.setInterval(update, intervalMs);
    return () => window.clearInterval(interval);
  }, [intervalMs, startedAt]);

  return elapsedMs;
}

function feedbackFor(depthCm: number, rate: number): Pick<ParticipantReading, 'feedback' | 'phaseLabel'> {
  if (depthCm < 5) return { feedback: '조금 더 깊게 압박하세요', phaseLabel: '압박 깊이 교정' };
  if (depthCm > 6) return { feedback: '압박 깊이를 조금 줄이세요', phaseLabel: '압박 깊이 교정' };
  if (rate < 100) return { feedback: '압박 속도를 높이세요', phaseLabel: '압박 속도 교정' };
  if (rate > 120) return { feedback: '속도를 조금 낮추세요', phaseLabel: '압박 속도 교정' };
  return { feedback: '좋습니다. 올바른 압박을 유지하세요', phaseLabel: '정확한 압박 유지' };
}

function liveParticipantReading(
  data: { depth: number; bpm: number } | null,
  elapsedMs: number
): ParticipantDisplayReading {
  if (!data) {
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
  const status = getStatusFromMetrics({ depthMm: depthCm * 10, rate, recoil: 100, score });

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

function ParticipantRuntime({ mode }: { mode: RuntimeMode }) {
  const elapsedMs = useElapsedMilliseconds();
  const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8765';
  const { data, isConnected } = useWebSocket(mode === 'live' ? wsUrl : '');
  const reading = mode === 'demo' ? getParticipantReading(elapsedMs) : liveParticipantReading(data, elapsedMs);

  return <ParticipantSessionScreen mode={mode} reading={reading} elapsedSeconds={elapsedMs / 1000} connected={mode === 'demo' || isConnected} />;
}

function buildLiveInstructorSession(data: { depth: number; bpm: number } | null, elapsedMs: number): DemoSession {
  const fallback = buildDemoSession(elapsedMs);
  const participant = liveParticipantReading(data, elapsedMs);
  const learner = {
    ...fallback.learners[0],
    name: '실습자 1',
    metrics: {
      depthMm: participant.depthCm * 10,
      rate: participant.rate,
      recoil: participant.recoil ?? 0,
      score: participant.score,
      aedUsed: false
    },
    status: participant.status
  };

  return {
    ...fallback,
    name: 'CPR 기본과정 · 실제 센서 실습',
    learners: [learner],
    alerts: learner.status === 'normal' || !data ? [] : [{
      id: `live-${learner.status}`,
      learnerId: learner.id,
      learnerName: learner.name,
      level: learner.status,
      message: participant.feedback,
      time: new Date().toLocaleTimeString('ko-KR', { hour12: false })
    }]
  };
}

function InstructorRuntime({ mode }: { mode: RuntimeMode }) {
  const elapsedMs = useElapsedMilliseconds(1000);
  const [selectedLearnerId, setSelectedLearnerId] = useState('learner-1');
  const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8765';
  const { data, isConnected } = useWebSocket(mode === 'live' ? wsUrl : '');
  const session = useMemo(
    () => mode === 'demo' ? buildDemoSession(elapsedMs) : buildLiveInstructorSession(data, elapsedMs),
    [data, elapsedMs, mode]
  );

  return <InstructorDashboardScreen mode={mode} session={session} selectedLearnerId={selectedLearnerId} onSelectLearner={setSelectedLearnerId} connected={mode === 'demo' || isConnected} />;
}

export function App() {
  const config = getRuntimeConfig(window.location.pathname, window.location.search);

  if (config.audience === 'participant') return <ParticipantRuntime mode={config.mode} />;
  if (config.audience === 'instructor') return <InstructorRuntime mode={config.mode} />;
  return <RoleLauncher origin={window.location.origin} />;
}
