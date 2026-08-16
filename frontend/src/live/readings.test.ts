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
    expect(buildLiveParticipantReading({ depth: 5.47, bpm: 111.2 }, 60_000, true)).toMatchObject({
      depthCm: 5.5,
      rate: 111,
      recoil: null,
      status: 'normal'
    });
  });
});
