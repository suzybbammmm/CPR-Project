import { useEffect, useState } from 'react';
import { useWebSocket } from './useWebSocket';
import { useGameContext } from '../context/GameContext';
import { getDemoWaveformReading } from '../utils/demoWaveform';

interface GameData {
  depth: number;
  bpm: number;
  accel_z: number;
}

export function useGameData() {
  const { dataMode, victimType } = useGameContext();
  const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8765';

  // WebSocket mode
  const { data: wsData, isConnected: wsConnected } = useWebSocket(
    dataMode === 'websocket' ? wsUrl : ''
  );

  // Simulation mode
  const [simulationData, setSimulationData] = useState<GameData>({
    depth: 0,
    bpm: 108,
    accel_z: 0
  });

  // Simulate data in simulation mode
  useEffect(() => {
    if (dataMode === 'simulation') {
      const startedAt = Date.now();
      const update = () => setSimulationData(getDemoWaveformReading(victimType, Date.now() - startedAt));
      update();
      const interval = setInterval(update, 80);
      return () => clearInterval(interval);
    }
  }, [dataMode, victimType]);

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
