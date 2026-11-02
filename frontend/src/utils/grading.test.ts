import { describe, expect, it } from 'vitest';
import { calculateGrade } from './grading';

describe('100-point CPR grade scale', () => {
  it.each([[100, 'S'], [90, 'S'], [89, 'A'], [80, 'A'], [79, 'B'], [70, 'B'], [69, 'C'], [60, 'C'], [59, 'D']])('maps %i points to %s', (score, grade) => {
    expect(calculateGrade(score)).toBe(grade);
  });
});
