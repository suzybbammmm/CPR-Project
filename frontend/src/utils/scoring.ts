import { DataPoint } from '../types/game.types';

export function isProperCompression(depth: number, bpm: number): boolean {
  return depth >= 5 && depth <= 6 && bpm >= 100 && bpm <= 120;
}

export function calculatePoints(
  depth: number,
  bpm: number,
  currentCombo: number
): { points: number; newCombo: number } {
  if (isProperCompression(depth, bpm)) {
    const basePoints = 10;
    const comboBonus = currentCombo * 2;
    return {
      points: basePoints + comboBonus,
      newCombo: currentCombo + 1
    };
  }
  return { points: 0, newCombo: 0 };
}

export function calculateProperPercent(dataHistory: DataPoint[]): number {
  if (dataHistory.length === 0) return 0;

  const properCount = dataHistory.filter(d =>
    isProperCompression(d.depth, d.bpm)
  ).length;
  return Math.round((properCount / dataHistory.length) * 100);
}

export function calculateAverages(dataHistory: DataPoint[]): {
  avgDepth: number;
  avgBpm: number;
} {
  if (dataHistory.length === 0) {
    return { avgDepth: 0, avgBpm: 0 };
  }

  const total = dataHistory.reduce(
    (acc, d) => ({ depth: acc.depth + d.depth, bpm: acc.bpm + d.bpm }),
    { depth: 0, bpm: 0 }
  );

  return {
    avgDepth: Number((total.depth / dataHistory.length).toFixed(1)),
    avgBpm: Math.round(total.bpm / dataHistory.length)
  };
}
