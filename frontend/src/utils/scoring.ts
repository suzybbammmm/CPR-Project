import { DataPoint } from '../types/game.types';

// Perfect compression for scoring (strict)
export function isProperCompression(depth: number, bpm: number): boolean {
  return depth >= 5 && depth <= 6 && bpm >= 100 && bpm <= 120;
}

// Acceptable compression for proper % calculation (more lenient)
export function isAcceptableCompression(depth: number, bpm: number): boolean {
  return depth >= 4 && depth <= 7 && bpm >= 80 && bpm <= 140;
}

export function calculatePoints(
  depth: number,
  bpm: number,
  currentCombo: number
): { points: number; newCombo: number } {
  // Perfect: 5-6cm AND 100-120 BPM
  if (depth >= 5 && depth <= 6 && bpm >= 100 && bpm <= 120) {
    const basePoints = 10;
    const comboBonus = currentCombo * 2;
    return {
      points: basePoints + comboBonus,
      newCombo: currentCombo + 1
    };
  }

  // Good: Depth OK but BPM slightly off, OR BPM OK but depth slightly off
  const depthGood = depth >= 4 && depth <= 7;
  const bpmGood = bpm >= 85 && bpm <= 135;

  if (depthGood && bpmGood) {
    // Good compression - reduced points but keeps combo
    const basePoints = 5;
    const comboBonus = Math.floor(currentCombo * 1);
    return {
      points: basePoints + comboBonus,
      newCombo: currentCombo + 1
    };
  }

  // Acceptable: At least one parameter is in acceptable range
  const depthAcceptable = depth >= 3 && depth <= 8;
  const bpmAcceptable = bpm >= 60 && bpm <= 150;

  if (depthAcceptable || bpmAcceptable) {
    // Acceptable compression - minimal points, combo resets
    return {
      points: 2,
      newCombo: 0
    };
  }

  // Poor compression - no points, combo resets
  return { points: 0, newCombo: 0 };
}

export function calculateProperPercent(dataHistory: DataPoint[]): number {
  if (dataHistory.length === 0) return 0;

  // dataHistory contains compression peaks
  // Count acceptable compressions (4-7cm AND 80-140 BPM) for more realistic percentage
  const acceptableCount = dataHistory.filter(d =>
    isAcceptableCompression(d.depth, d.bpm)
  ).length;

  return Math.round((acceptableCount / dataHistory.length) * 100);
}

export function calculateAverages(dataHistory: DataPoint[]): {
  avgDepth: number;
  avgBpm: number;
} {
  if (dataHistory.length === 0) {
    return { avgDepth: 0, avgBpm: 0 };
  }

  // dataHistory contains compression samples (already filtered by depth >= 3cm)
  const total = dataHistory.reduce(
    (acc, d) => ({ depth: acc.depth + d.depth, bpm: acc.bpm + d.bpm }),
    { depth: 0, bpm: 0 }
  );

  return {
    avgDepth: Number((total.depth / dataHistory.length).toFixed(1)),
    avgBpm: Math.round(total.bpm / dataHistory.length)
  };
}
