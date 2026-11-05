import { useEffect, useMemo, useState } from 'react';
import { HandoffOverlay } from './components/HandoffOverlay';
import { ParticleBackground } from './components/shared/ParticleBackground';
import { getRuntimeConfig, RuntimeMode } from './config/runtime';
import { GameContextProvider, useGameContext } from './context/GameContext';
import { buildDemoSession, DemoSession, MonitoringStatus } from './demo/scenario';
import { useWebSocket } from './hooks/useWebSocket';
import { buildLiveParticipantReading } from './live/readings';
import { GamePlayScreen } from './pages/GamePlayScreen';
import { InstructorDashboardScreen } from './pages/InstructorDashboardScreen';
import { MainScreen } from './pages/MainScreen';
import { MultiplayerResultScreen } from './pages/MultiplayerResultScreen';
import { RoleLauncher } from './pages/RoleLauncher';
import { TeamPracticeScreen } from './pages/TeamPracticeScreen';
import { LeaderboardScreen } from './pages/LeaderboardScreen';
import { AdminScreen } from './pages/AdminScreen';
import { useTeamSession } from './hooks/useTeamSession';
import { CprTechniqueGuideScreen } from './pages/CprTechniqueGuideScreen';
import { getLiveCoachFeedback } from './utils/cprCoach';
import { VictimType } from './utils/cprGuidance';

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

function buildLiveInstructorSession(data: { depth: number; bpm: number; compressionCount?: number; recoilPercent?: number | null; compressionPeakCm?: number } | null, elapsedMs: number, connected: boolean, victimType: VictimType): DemoSession {
  const fallback = buildDemoSession(elapsedMs);
  const participant = buildLiveParticipantReading(data, elapsedMs, connected, victimType);
  const coach = getLiveCoachFeedback({
    sensorOnline: connected,
    victimType,
    depth: data?.compressionCount ? data.compressionPeakCm ?? participant.depthCm : participant.depthCm,
    bpm: participant.rate,
    compressionCount: participant.compressionCount
  });
  const status: MonitoringStatus = coach.severity === 'good' ? 'normal' : coach.severity === 'offline' ? 'urgent' : 'caution';
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
    status
  };

  return {
    ...fallback,
    name: 'CPR 기본과정 · 실제 센서 실습',
    learners: [learner],
    alerts: learner.status === 'normal' ? [] : [{
      id: `live-${learner.status}`,
      learnerId: learner.id,
      learnerName: learner.name,
      level: learner.status === 'urgent' ? 'urgent' as const : 'caution' as const,
      message: coach.action,
      time: new Date().toLocaleTimeString('ko-KR', { hour12: false })
    }]
  };
}

function InstructorRuntime({ mode, victimType }: { mode: RuntimeMode; victimType: VictimType }) {
  const elapsedMs = useElapsedMilliseconds(1000);
  const [selectedLearnerId, setSelectedLearnerId] = useState('learner-1');
  const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8765';
  const { data, sensorOnline } = useWebSocket(mode === 'live' ? wsUrl : '');
  const session = useMemo(
    () => mode === 'demo' ? buildDemoSession(elapsedMs) : buildLiveInstructorSession(data, elapsedMs, sensorOnline, victimType),
    [data, elapsedMs, sensorOnline, mode, victimType]
  );
  const coach = getLiveCoachFeedback({
    sensorOnline: mode === 'demo' || sensorOnline,
    victimType,
    depth: mode === 'demo' ? session.learners[0].metrics.depthMm / 10 : data?.compressionCount ? data.compressionPeakCm : data?.depth ?? 0,
    bpm: mode === 'demo' ? session.learners[0].metrics.rate : data?.bpm ?? 0,
    compressionCount: mode === 'demo' ? Math.max(1, Math.floor(elapsedMs / 600)) : data?.compressionCount ?? 0
  });

  return <InstructorDashboardScreen mode={mode} session={session} selectedLearnerId={selectedLearnerId} onSelectLearner={setSelectedLearnerId} connected={mode === 'demo' || sensorOnline} coach={coach} />;
}

function ParticipantRuntime({ mode, victimType, playerCount, started }: { mode: RuntimeMode; victimType: VictimType; playerCount: number; started: boolean }) {
 const team=useTeamSession(mode,victimType,playerCount,started);
 return <TeamPracticeScreen mode={mode} victimType={team.session.victimType} playerCount={team.session.playerCount} phase={team.session.phase} currentPlayerIndex={team.session.currentPlayerIndex}
 elapsedSeconds={team.elapsedSeconds} remainingSeconds={team.remainingSeconds} connected={team.connected} reading={team.reading} coach={team.coach} game={team.game}
 results={team.session.results} participants={team.session.participants} saveStatus={team.saveStatus}
 onConfigure={team.configure} onRegisterParticipants={team.setParticipants} onStart={team.start} onEndRound={team.endRound} onNextPlayer={team.nextPlayer} onChangeSettings={team.reset}/>;
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

function ParticipantGameExperience({ mode, victimType }: { mode: RuntimeMode; victimType: VictimType }) {
  return (
    <GameContextProvider dataMode={mode === 'live' ? 'websocket' : 'simulation'} initialVictimType={victimType}>
      <LegacyGameContent />
      <div className="pointer-events-none fixed right-4 top-4 z-50 rounded-full border border-white/15 bg-surface-900/85 px-4 py-2 text-xs font-semibold text-white/80 shadow-lg backdrop-blur">
        {mode === 'demo' ? '시연 모드 · 가상 센서 데이터' : '실제 센서 모드'}
      </div>
    </GameContextProvider>
  );
}

export function App() {
  const config = getRuntimeConfig(window.location.pathname, window.location.search);
  if (config.audience === 'participant') return <ParticipantRuntime mode={config.mode} victimType={config.victimType} playerCount={config.playerCount} started={config.started} />;
  if (config.audience === 'instructor') return <InstructorRuntime mode={config.mode} victimType={config.victimType} />;
  if (config.audience === 'game') return <ParticipantGameExperience mode={config.mode} victimType={config.victimType} />;
  if (config.audience === 'guide') return <CprTechniqueGuideScreen />;
  if (config.audience === 'leaderboard') return <LeaderboardScreen />;
  if (config.audience === 'admin') return <AdminScreen />;
  return <RoleLauncher origin={window.location.origin} />;
}
