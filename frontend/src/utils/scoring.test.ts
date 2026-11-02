import { describe, expect, it } from 'vitest';
import { calculatePoints } from './scoring';

describe('CPR practice scoring', () => {
  it('awards two points for a correct compression regardless of combo size', () => {
    expect(calculatePoints(5.5, 108, 30, 'adult')).toEqual({
      points: 2,
      newCombo: 31
    });
  });

  it('still rewards an accurate compression more than an acceptable one', () => {
    const accurate = calculatePoints(5.5, 108, 0, 'adult');
    const acceptable = calculatePoints(4.5, 130, 0, 'adult');

    expect(accurate.points).toBeGreaterThan(acceptable.points);
  });

  it('resets the combo when either strict depth or speed target is missed', () => {
    expect(calculatePoints(4.5, 108, 12, 'adult')).toEqual({ points: 1, newCombo: 0 });
    expect(calculatePoints(5.5, 125, 12, 'adult')).toEqual({ points: 1, newCombo: 0 });
  });
});
