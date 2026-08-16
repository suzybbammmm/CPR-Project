import type { VictimType } from '../utils/cprGuidance';

export type DataMode = 'websocket' | 'simulation';
export type Screen = 'main' | 'playing' | 'handoff' | 'final-results';
export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

export interface WebSocketMessage {
  depth: number;
  accel_z: number;
  bpm: number;
  timestamp: number;
}

export interface DataPoint {
  time: string;        // "10s", "20s", etc.
  depth: number;
  bpm: number;
  timestamp: number;
}

export interface PlayerResult {
  playerNumber: number;
  score: number;
  grade: Grade;
  properCompressionPercent: number;
  avgDepth: number;
  avgBpm: number;
  maxCombo: number;
  victimType: VictimType;
  dataHistory: DataPoint[];
}

export interface GameContextType {
  playerCount: number;
  setPlayerCount: (count: number) => void;
  victimType: VictimType;
  setVictimType: (victimType: VictimType) => void;
  dataMode: DataMode;
  screen: Screen;
  setScreen: (screen: Screen) => void;
  currentPlayerIndex: number;
  allPlayerResults: PlayerResult[];
  startGame: () => void;
  savePlayerResult: (result: PlayerResult) => void;
  proceedToNextPlayer: () => void;
  returnToMain: () => void;
}
