export interface SensorReading {
  type: 'reading';
  deviceId: string;
  sequence: number;
  depth: number;
  compressionPeakCm: number;
  compressionCount: number;
  bpm: number;
  recoilPercent: number | null;
  compressionBpm: number | null;
  accelZ: number;
  gyroZ: number;
  timestamp: number;
}

function finiteNumber(value: unknown, fallback = 0): number {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

export function normalizeSensorReading(message: unknown): SensorReading | null {
  if (!message || typeof message !== 'object') return null;
  const payload = message as Record<string, unknown>;
  if (payload.type && payload.type !== 'reading') return null;
  if (!('depth' in payload) || !('bpm' in payload)) return null;

  return {
    type: 'reading',
    deviceId: typeof payload.device_id === 'string' ? payload.device_id : 'manikin-01',
    sequence: Math.max(0, Math.trunc(finiteNumber(payload.sequence))),
    depth: Math.max(0, finiteNumber(payload.depth)),
    compressionPeakCm: Math.max(0, finiteNumber(payload.compression_peak_cm, finiteNumber(payload.depth))),
    compressionCount: Math.max(0, Math.trunc(finiteNumber(payload.compression_count))),
    recoilPercent: typeof payload.recoil_percent === 'number' && Number.isFinite(payload.recoil_percent) && payload.recoil_percent >= 0 && payload.recoil_percent <= 100 ? payload.recoil_percent : null,
    compressionBpm: typeof payload.compression_bpm === 'number' && Number.isFinite(payload.compression_bpm) && payload.compression_bpm >= 0 && payload.compression_bpm <= 250 ? payload.compression_bpm : null,
    bpm: Math.max(0, finiteNumber(payload.bpm)),
    accelZ: finiteNumber(payload.accel_z),
    gyroZ: finiteNumber(payload.gyro_z),
    timestamp: Math.max(0, Math.trunc(finiteNumber(payload.timestamp)))
  };
}

export function isFreshSensorReading(receivedAt: number | null, now: number, staleAfterMs = 1_000): boolean {
  return receivedAt !== null && now - receivedAt < staleAfterMs;
}
