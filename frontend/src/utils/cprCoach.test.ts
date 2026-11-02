import { describe, expect, it } from 'vitest';
import { analyzeCprSession, getLiveCoachFeedback } from './cprCoach';
import { DataPoint } from '../types/game.types';

const peak = (depth: number, bpm: number): DataPoint => ({ time: '0', depth, bpm, timestamp: 1 });

describe('evidence-based live CPR coach', () => {
  it.each([
    ['adult', 5, 100],
    ['adult', 6, 120],
    ['child', 4, 100],
    ['child', 5, 120],
    ['infant', 3.5, 100],
    ['infant', 4.5, 120]
  ] as const)('accepts the lower guideline boundary for %s', (victimType, depth, bpm) => {
    expect(getLiveCoachFeedback({ sensorOnline: true, victimType, depth, bpm, compressionCount: 2 }).severity).toBe('good');
  });

  it('prioritizes an offline sensor over all measurement feedback', () => {
    expect(getLiveCoachFeedback({ sensorOnline: false, victimType: 'adult', depth: 5.5, bpm: 110, compressionCount: 4 })).toMatchObject({
      severity: 'offline',
      action: expect.stringContaining('센서 데이터를 기다리고')
    });
  });

  it('asks the learner to start before any completed compression', () => {
    expect(getLiveCoachFeedback({ sensorOnline: true, victimType: 'adult', depth: 0, bpm: 0, compressionCount: 0 }).action).toContain('압박을 시작');
  });

  it('focuses on the larger deviation and mentions the other issue briefly', () => {
    const feedback = getLiveCoachFeedback({ sensorOnline: true, victimType: 'adult', depth: 3.5, bpm: 80, compressionCount: 3 });
    expect(feedback.action).toContain('깊이');
    expect(feedback.rationale).toContain('속도');
  });

  it('gives rate coaching only after depth is within target', () => {
    const feedback = getLiveCoachFeedback({ sensorOnline: true, victimType: 'adult', depth: 5.5, bpm: 130, compressionCount: 3 });
    expect(feedback.action).toContain('속도');
    expect(feedback.criterion).toContain('100–120');
  });

  it.each([[90, '높이세요'], [130, '낮추세요']] as const)('coaches both slow and fast rates (%i BPM)', (bpm, action) => {
    expect(getLiveCoachFeedback({ sensorOnline: true, victimType: 'adult', depth: 5.5, bpm, compressionCount: 3 }).action).toContain(action);
  });
});

describe('session AI analysis', () => {
  it('summarizes a stable correct session using actual compression peaks', () => {
    const analysis = analyzeCprSession([peak(5.2, 104), peak(5.5, 108), peak(5.8, 112), peak(5.6, 110)], 'adult');
    expect(analysis).toMatchObject({ totalCompressions: 4, properPercent: 100, depthProperPercent: 100, rateProperPercent: 100 });
    expect(analysis.strength).toContain('깊이');
  });

  it('identifies shallow depth as the highest-priority correction', () => {
    const analysis = analyzeCprSession([peak(3.8, 110), peak(4.1, 108), peak(4.2, 112), peak(4.0, 109)], 'adult');
    expect(analysis.priority).toContain('깊이');
    expect(analysis.nextGoal).toContain('5–6cm');
  });

  it('identifies unstable speed as the priority when depth stays correct', () => {
    const analysis = analyzeCprSession([peak(5.2, 80), peak(5.5, 135), peak(5.8, 85), peak(5.6, 140)], 'adult');
    expect(analysis.depthProperPercent).toBe(100);
    expect(analysis.priority).toContain('속도');
  });

  it('returns a safe no-data analysis instead of inventing performance', () => {
    expect(analyzeCprSession([], 'adult')).toMatchObject({
      totalCompressions: 0,
      insufficientData: true,
      summary: expect.stringContaining('분석할 완료 압박')
    });
  });
});
