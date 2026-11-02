import { describe, expect, it } from 'vitest';
import { isFreshSensorReading, normalizeSensorReading } from './sensorState';

describe('sensor reading protocol', () => {
  it('accepts the ESP32 reading envelope including completed-compression metadata', () => {
    expect(normalizeSensorReading({
      type: 'reading',
      device_id: 'manikin-01',
      sequence: 12,
      depth: 5.4,
      compression_peak_cm: 5.8,
      compression_count: 7,
      bpm: 108,
      accel_z: 0.3,
      gyro_z: 0.02,
      timestamp: 1234
    })).toMatchObject({
      deviceId: 'manikin-01',
      sequence: 12,
      depth: 5.4,
      compressionPeakCm: 5.8,
      compressionCount: 7,
      bpm: 108
    });
  });

  it('keeps backwards compatibility with the old ESP32 payload', () => {
    expect(normalizeSensorReading({ depth: 5.1, bpm: 104, accel_z: 0, timestamp: 7 })).toMatchObject({
      deviceId: 'manikin-01',
      depth: 5.1,
      compressionCount: 0
    });
  });

  it('marks a reading stale one second after it arrived', () => {
    expect(isFreshSensorReading(1_000, 1_999)).toBe(true);
    expect(isFreshSensorReading(1_000, 2_000)).toBe(false);
  });
});

 it('preserves measured recoil and leaves absent or invalid recoil unmeasured', () => {
   const frame = {depth: 2, bpm: 110};
   expect(normalizeSensorReading({...frame, recoil_percent: 82.4})?.recoilPercent).toBe(82.4);
   for (const value of [undefined, null, -1, 101, '82', true]) {
     expect(normalizeSensorReading({...frame, recoil_percent: value})?.recoilPercent).toBeNull();
   }
 });
