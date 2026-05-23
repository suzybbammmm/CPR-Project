import React from 'react';
import { ParticleBackground } from './components/shared/ParticleBackground';
import { GameContextProvider, useGameContext } from './context/GameContext';
import { MainScreen } from './pages/MainScreen';
import { GamePlayScreen } from './pages/GamePlayScreen';
import { HandoffOverlay } from './components/HandoffOverlay';
import { MultiplayerResultScreen } from './pages/MultiplayerResultScreen';

function AppContent() {
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
  return (
    <GameContextProvider>
      <AppContent />
    </GameContextProvider>
  );
}