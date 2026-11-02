import React, { createContext, useContext, useState, ReactNode } from 'react';
import { GameContextType, PlayerResult, Screen, DataMode } from '../types/game.types';
import type { VictimType } from '../utils/cprGuidance';

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameContextProvider({ children, dataMode: dataModeOverride, initialVictimType = 'adult' }: { children: ReactNode; dataMode?: DataMode; initialVictimType?: VictimType }) {
  const [playerCount, setPlayerCount] = useState(1);
  const [victimType, setVictimType] = useState<VictimType>(initialVictimType);
  const [screen, setScreen] = useState<Screen>('main');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [allPlayerResults, setAllPlayerResults] = useState<PlayerResult[]>([]);

  // Read from environment variable
  const dataMode: DataMode = dataModeOverride
    ?? (import.meta.env.VITE_DATA_MODE === 'websocket' ? 'websocket' : 'simulation');

  const startGame = () => {
    setCurrentPlayerIndex(0);
    setAllPlayerResults([]);
    setScreen('playing');
  };

  const savePlayerResult = (result: PlayerResult) => {
    setAllPlayerResults(prev => [...prev, result]);
  };

  const proceedToNextPlayer = () => {
    if (currentPlayerIndex + 1 < playerCount) {
      setCurrentPlayerIndex(prev => prev + 1);
      setScreen('playing');
    } else {
      setScreen('final-results');
    }
  };

  const returnToMain = () => {
    setScreen('main');
    setCurrentPlayerIndex(0);
    setAllPlayerResults([]);
  };

  const value: GameContextType = {
    playerCount,
    setPlayerCount,
    victimType,
    setVictimType,
    dataMode,
    screen,
    setScreen,
    currentPlayerIndex,
    allPlayerResults,
    startGame,
    savePlayerResult,
    proceedToNextPlayer,
    returnToMain
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within GameContextProvider');
  }
  return context;
}
