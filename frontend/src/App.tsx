import React, { useEffect, useMemo, useState } from 'react';
import { HandoffOverlay } from './components/HandoffOverlay';
import { ParticleBackground } from './components/shared/ParticleBackground';
import { getRuntimeConfig, RuntimeMode } from './config/runtime';
import { GameContextProvider, useGameContext } from './context/GameContext';
import { buildDemoSession, DemoSession } from './demo/scenario';
import { useWebSocket } from './hooks/useWebSocket';
import { buildLiveParticipantReading } from './live/readings';
import { GamePlayScreen } from './pages/GamePlayScreen';
import { InstructorDashboardScreen } from './pages/InstructorDashboardScreen';
import { MainScreen } from './pages/MainScreen';
import { MultiplayerResultScreen } from './pages/MultiplayerResultScreen';
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

function ParticipantGameExperience({ mode }: { mode: RuntimeMode }) {
  return (
    <GameContextProvider dataMode={mode === 'live' ? 'websocket' : 'simulation'}>
      <LegacyGameContent />
      <div className="pointer-events-none fixed right-4 top-4 z-50 rounded-full border border-white/15 bg-surface-900/85 px-4 py-2 text-xs font-semibold text-white/80 shadow-lg backdrop-blur">
        {mode === 'demo' ? '시연 모드 · 가상 센서 데이터' : '실제 센서 모드'}
      </div>
    </GameContextProvider>
  );
}

export function App() {
  const config = getRuntimeConfig(window.location.pathname, window.location.search);
  if (config.audience === 'participant') return <ParticipantGameExperience mode={config.mode} />;
  if (config.audience === 'instructor') return <InstructorRuntime mode={config.mode} />;
  if (config.audience === 'game') return <GameContextProvider><LegacyGameContent /></GameContextProvider>;
  return <RoleLauncher origin={window.location.origin} />;
}
