import React, { useEffect, useMemo, useState } from 'react';
import { HandoffOverlay } from './components/HandoffOverlay';
import { ParticleBackground } from './components/shared/ParticleBackground';
import { getRuntimeConfig, RuntimeMode } from './config/runtime';
import { GameContextProvider, useGameContext } from './context/GameContext';
import { buildDemoSession, DemoSession, getParticipantReading } from './demo/scenario';
import { useWebSocket } from './hooks/useWebSocket';
import { buildLiveParticipantReading } from './live/readings';
import { GamePlayScreen } from './pages/GamePlayScreen';
import { InstructorDashboardScreen } from './pages/InstructorDashboardScreen';
import { MainScreen } from './pages/MainScreen';
import { MultiplayerResultScreen } from './pages/MultiplayerResultScreen';
import { ParticipantSessionScreen } from './pages/ParticipantSessionScreen';
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

function ParticipantRuntime({ mode }: { mode: RuntimeMode }) {
  const elapsedMs = useElapsedMilliseconds();
  const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8765';
  const { data, isConnected } = useWebSocket(mode === 'live' ? wsUrl : '');
  const reading = mode === 'demo'
    ? getParticipantReading(elapsedMs)
    : buildLiveParticipantReading(data, elapsedMs, isConnected);

  return <ParticipantSessionScreen mode={mode} reading={reading} elapsedSeconds={elapsedMs / 1000} connected={mode === 'demo' || isConnected} />;
}

function buildLiveInstructorSession(data: { depth: number; bpm: number } | null, elapsedMs: number, connected: boolean): DemoSession {
  const fallback = buildDemoSession(elapsedMs);
  const participant = buildLiveParticipantReading(data, elapsedMs, connected);
  const learner = {
    ...fallback.learners[0],
    name: '실습자 1',
    metrics: {
      depthMm: participant.depthCm * 10,
      rate: participant.rate,
      recoil: participant.recoil,
      score: participant.score,
      aedUsed: false
    },
    status: participant.status
  };

  return {
    ...fallback,
    name: 'CPR 기본과정 · 실제 센서 실습',
    learners: [learner],
    alerts: learner.status === 'normal' || !connected || !data ? [] : [{
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
    () => mode === 'demo' ? buildDemoSession(elapsedMs) : buildLiveInstructorSession(data, elapsedMs, isConnected),
    [data, elapsedMs, isConnected, mode]
  );

  return <InstructorDashboardScreen mode={mode} session={session} selectedLearnerId={selectedLearnerId} onSelectLearner={setSelectedLearnerId} connected={mode === 'demo' || isConnected} />;
}

function LegacyGameContent() {
  const { screen } = useGameContext();
  return (
    <div className="relative w-full min-h-screen bg-surface-900 overflow-x-hidden">
      <ParticleBackground count={45} />
      {screen === 'main' && <MainScreen />}
      {screen === 'playing' && <GamePlayScreen />}
      {screen === 'handoff' && <HandoffOverlay />}
      {screen === 'final-results' && <MultiplayerResultScreen />}
    </div>
  );
}

export function App() {
  const config = getRuntimeConfig(window.location.pathname, window.location.search);
  if (config.audience === 'participant') return <ParticipantRuntime mode={config.mode} />;
  if (config.audience === 'instructor') return <InstructorRuntime mode={config.mode} />;
  if (config.audience === 'game') return <GameContextProvider><LegacyGameContent /></GameContextProvider>;
  return <RoleLauncher origin={window.location.origin} />;
}
