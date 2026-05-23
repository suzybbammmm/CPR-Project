import { useEffect, useState } from 'react';
import { useWebSocket } from './useWebSocket';
import { useGameContext } from '../context/GameContext';

interface GameData {
  depth: number;
  bpm: number;
  accel_z: number;
}

export function useGameData() {
  const { dataMode } = useGameContext();
  const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8765';

  // WebSocket mode
  const { data: wsData, isConnected: wsConnected } = useWebSocket(
    dataMode === 'websocket' ? wsUrl : ''
  );

  // Simulation mode
  const [simulationData, setSimulationData] = useState<GameData>({
    depth: 5.4,
    bpm: 108,
    accel_z: 0
  });

  // Simulate data in simulation mode
  useEffect(() => {
    if (dataMode === 'simulation') {
      const interval = setInterval(() => {
        setSimulationData({
          depth: 4.5 + Math.random() * 2.2,
          bpm: Math.floor(90 + Math.random() * 40),
          accel_z: Math.random() * 2 - 1
        });
      }, 800);
      return () => clearInterval(interval);
    }
  }, [dataMode]);

  // Return appropriate data based on mode
  if (dataMode === 'websocket') {
    return {
      data: wsData ? {
        depth: wsData.depth,
        bpm: wsData.bpm,
        accel_z: wsData.accel_z
      } : null,
      isConnected: wsConnected
    };
  }

  return {
    data: simulationData,
    isConnected: true // Simulation is always "connected"
  };
}
