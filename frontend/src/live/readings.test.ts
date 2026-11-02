import { describe, expect, it } from 'vitest';
import { buildLiveParticipantReading } from './readings';

describe('buildLiveParticipantReading', () => {
  it('does not display a stale sensor message after disconnect', () => {
    const staleMessage = { depth: 5.5, bpm: 110 };

    expect(buildLiveParticipantReading(staleMessage, 60_000, false)).toMatchObject({
      depthCm: 0,
      rate: 0,
      compressionCount: 0,
      feedback: '센서 연결 후 압박을 시작하세요'
    });
  });

  it('normalizes a connected sensor reading without inventing recoil', () => {
    expect(buildLiveParticipantReading({ depth: 5.47, bpm: 111.2, compressionCount: 18 }, 60_000, true)).toMatchObject({
      depthCm: 5.5,
      rate: 111,
      compressionCount: 18,
      recoil: null,
      status: 'normal'
    });
  });
});

 it('passes real recoil through and clears it when sensor is offline', () => {
   const frame = {depth: 5.4, bpm: 110, recoilPercent: 81.5};
   expect(buildLiveParticipantReading(frame, 0, true).recoil).toBe(82);
   expect(buildLiveParticipantReading(frame, 0, false).recoil).toBeNull();
 });

 it('evaluates a released frame using the last peak rather than calling it shallow', () => {
   const frame = {depth: 0, bpm: 110, compressionCount: 4, compressionPeakCm: 5.5, recoilPercent: 100};
   expect(buildLiveParticipantReading(frame, 0, true)).toMatchObject({depthCm: 0, score: 100, phaseLabel: '정확한 압박 유지'});
 });
