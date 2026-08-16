import { describe, expect, it } from 'vitest';
import {
  CPR_PROFILES,
  getCompressionFeedback,
  getRotationPrompt
} from './cprGuidance';

describe('CPR guidance profiles', () => {
  it('uses different training targets for adult, child, and infant victims', () => {
    expect(CPR_PROFILES.adult.targetDepthCm).toEqual({ min: 5, max: 6 });
    expect(CPR_PROFILES.child.targetDepthCm).toEqual({ min: 4.5, max: 5.5 });
    expect(CPR_PROFILES.infant.targetDepthCm).toEqual({ min: 3.5, max: 4.5 });
  });

  it('gives depth feedback against the selected victim target', () => {
    expect(getCompressionFeedback('adult', 4.4, 110).message).toContain('더 깊게');
    expect(getCompressionFeedback('infant', 5.1, 110).message).toContain('조금 줄이');
    expect(getCompressionFeedback('child', 5, 110).tone).toBe('good');
  });
});

describe('rotation prompts', () => {
  it('does not prompt a solo participant to rotate', () => {
    expect(getRotationPrompt({ playerCount: 1, secondsRemaining: 10 })).toBeNull();
  });

  it('warns a team before its two-minute rotation ends', () => {
    const prompt = getRotationPrompt({ playerCount: 3, secondsRemaining: 10 });
    expect(prompt?.kind).toBe('warning');
    expect(prompt?.message).toContain('10초 후 교대');
  });

  it('requires a handoff when the rotation time ends', () => {
    const prompt = getRotationPrompt({ playerCount: 2, secondsRemaining: 0 });
    expect(prompt?.kind).toBe('handoff');
    expect(prompt?.message).toContain('지금 교대');
  });
});
