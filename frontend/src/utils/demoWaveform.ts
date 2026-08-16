import { CPR_PROFILES, VictimType } from './cprGuidance';

export interface DemoWaveformReading {
  depth: number;
  bpm: number;
  accel_z: number;
}

const DEMO_CYCLE_MS = 72_000;

function phaseFor(elapsedMs: number): { depthOffset: number; bpm: number } {
  const phaseMs = Math.max(0, elapsedMs) % DEMO_CYCLE_MS;
  if (phaseMs < 18_000) return { depthOffset: 0, bpm: 108 };
  if (phaseMs < 30_000) return { depthOffset: -0.8, bpm: 108 };
  if (phaseMs < 42_000) return { depthOffset: 0, bpm: 128 };
  if (phaseMs < 54_000) return { depthOffset: 0.8, bpm: 112 };
  return { depthOffset: 0, bpm: 108 };
}

export function getDemoWaveformReading(victimType: VictimType, elapsedMs: number): DemoWaveformReading {
  const phase = phaseFor(elapsedMs);
  const target = CPR_PROFILES[victimType].targetDepthCm;
  const peakDepth = Math.max(0.5, (target.min + target.max) / 2 + phase.depthOffset);
  const compressionPeriodMs = 60_000 / phase.bpm;
  const compressionProgress = (Math.max(0, elapsedMs) % compressionPeriodMs) / compressionPeriodMs;
  const pulse = Math.max(0, Math.sin(Math.PI * compressionProgress));
  const depth = Number((peakDepth * pulse * pulse).toFixed(2));

  return {
    depth,
    bpm: phase.bpm,
    accel_z: Number((Math.cos(Math.PI * compressionProgress) * peakDepth).toFixed(2))
  };
}
