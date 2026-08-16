import { describe, expect, it } from 'vitest';
import {
  buildDemoSession,
  getDemoPhase,
  getParticipantReading,
  getStatusFromMetrics
} from './scenario';

describe('gallery demo scenario', () => {
  it('cycles through every presentation phase and returns to normal', () => {
    expect(getDemoPhase(0).id).toBe('normal');
    expect(getDemoPhase(12_000).id).toBe('shallow');
    expect(getDemoPhase(24_000).id).toBe('fast');
    expect(getDemoPhase(36_000).id).toBe('recoil');
    expect(getDemoPhase(48_000).id).toBe('urgent');
    expect(getDemoPhase(60_000).id).toBe('recovery');
    expect(getDemoPhase(72_000).id).toBe('normal');
  });

  it('keeps the participant reading deterministic and presentation-ready', () => {
    expect(getParticipantReading(12_000)).toMatchObject({
      depthCm: 4.3,
      feedback: '조금 더 깊게 압박하세요',
      status: 'caution'
    });
    expect(getParticipantReading(12_000)).toEqual(getParticipantReading(12_000));
  });

  it('uses the documented instructor thresholds', () => {
    expect(getStatusFromMetrics({ depthMm: 54, rate: 110, recoil: 95, score: 92 })).toBe('normal');
    expect(getStatusFromMetrics({ depthMm: 47, rate: 110, recoil: 88, score: 73 })).toBe('caution');
    expect(getStatusFromMetrics({ depthMm: 41, rate: 142, recoil: 72, score: 42 })).toBe('urgent');
  });

  it('builds eight stations and mirrors participant one on station A', () => {
    const participant = getParticipantReading(48_000);
    const session = buildDemoSession(48_000);

    expect(session.learners).toHaveLength(8);
    expect(session.learners.map((learner) => learner.station)).toEqual([
      '스테이션 A',
      '스테이션 B',
      '스테이션 C',
      '스테이션 D',
      '스테이션 E',
      '스테이션 F',
      '스테이션 G',
      '스테이션 H'
    ]);
    expect(session.learners[0].metrics.depthMm).toBe(participant.depthCm * 10);
    expect(session.learners[0].status).toBe(participant.status);
    expect(session.alerts[0]).toMatchObject({
      learnerId: 'learner-1',
      level: 'urgent'
    });
  });
});
