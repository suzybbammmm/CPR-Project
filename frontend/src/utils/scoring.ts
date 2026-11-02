import { DataPoint } from '../types/game.types';
import { CPR_PROFILES, VictimType } from './cprGuidance';

function depthWindow(victimType: VictimType) {
  return CPR_PROFILES[victimType].targetDepthCm;
}

// Perfect compression for scoring (strict)
export function isProperCompression(depth: number, bpm: number, victimType: VictimType = 'adult'): boolean {
  const target = depthWindow(victimType);
  return depth >= target.min && depth <= target.max && bpm >= 100 && bpm <= 120;
}

// Acceptable compression for proper % calculation (more lenient)
export function isAcceptableCompression(depth: number, bpm: number, victimType: VictimType = 'adult'): boolean {
  const target = depthWindow(victimType);
  return depth >= target.min - 1 && depth <= target.max + 1 && bpm >= 80 && bpm <= 140;
}

export function calculatePoints(
  depth: number,
  bpm: number,
  currentCombo: number,
  victimType: VictimType = 'adult'
): { points: number; newCombo: number } {
  const target = depthWindow(victimType);
  // Perfect: 5-6cm AND 100-120 BPM
  if (depth >= target.min && depth <= target.max && bpm >= 100 && bpm <= 120) {
    return {
      points: 2,
      newCombo: currentCombo + 1
    };
  }

  // Good: Depth OK but BPM slightly off, OR BPM OK but depth slightly off
  const depthGood = depth >= target.min - 1 && depth <= target.max + 1;
  const bpmGood = bpm >= 85 && bpm <= 135;

  if (depthGood && bpmGood) {
    return {
      points: 1,
      newCombo: 0
    };
  }

  // Acceptable: At least one parameter is in acceptable range
  const depthAcceptable = depth >= Math.max(0, target.min - 2) && depth <= target.max + 2;
  const bpmAcceptable = bpm >= 60 && bpm <= 150;

  if (depthAcceptable || bpmAcceptable) {
    // Acceptable compression - minimal points, combo resets
    return { points: 0, newCombo: 0 };
  }

  // Poor compression - no points, combo resets
  return { points: 0, newCombo: 0 };
}

export function calculateProperPercent(dataHistory: DataPoint[], victimType: VictimType = 'adult'): number {
  if (dataHistory.length === 0) return 0;

  // dataHistory contains compression peaks
  // Count acceptable compressions (4-7cm AND 80-140 BPM) for more realistic percentage
  const acceptableCount = dataHistory.filter(d =>
    isAcceptableCompression(d.depth, d.bpm, victimType)
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
