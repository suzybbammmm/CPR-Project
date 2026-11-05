import { describe, expect, it } from 'vitest';
import { metricCue, practiceBonus } from './practiceGame';
const exact = { depth: 5.5, bpm: 110, recoil: null };
describe('practice display bonus', () => {
  it('doubles at milestones and caps at eight', () => {
    for (const [count, gamePoints, multiplier] of [[4,80,1],[5,120,2],[10,360,4],[20,1240,8],[21,1400,8]]) {
      expect(practiceBonus(Array(count).fill(exact), 'adult')).toMatchObject({ gamePoints, multiplier });
    }
  });
  it('resets on near, poor or unknown rate', () => {
    const streak = Array(5).fill(exact);
    expect(practiceBonus([...streak,{...exact,bpm:null},exact], 'adult')).toMatchObject({gamePoints:140,multiplier:1});
    expect(practiceBonus([...streak,{...exact,bpm:130},exact], 'adult').gamePoints).toBe(150);
    expect(practiceBonus([...streak,{...exact,depth:1,bpm:50},exact], 'adult').gamePoints).toBe(140);
  });
  it('uses the selected depth profile', () => {
    expect(practiceBonus(Array(5).fill({...exact,depth:4}), 'child').multiplier).toBe(2);
    expect(practiceBonus(Array(5).fill({...exact,depth:4}), 'adult').multiplier).toBe(1);
  });
});
describe('per-metric feedback', () => {
  it('covers shallow, deep, slow, fast and target boundaries', () => {
    expect(metricCue(4,5,6,'depth',true,true).text).toContain('더 깊게');
    expect(metricCue(7,5,6,'depth',true,true).text).toContain('얕게');
    expect(metricCue(90,100,120,'rate',true,true).text).toContain('올리세요');
    expect(metricCue(130,100,120,'rate',true,true).text).toContain('낮추세요');
    for(const value of [100,120]) expect(metricCue(value,100,120,'rate',true,true).tone).toBe('good');
  });
  it('waits before measurement and while offline', () => {
    expect(metricCue(110,100,120,'rate',false,true).tone).toBe('waiting');
    expect(metricCue(0,100,120,'rate',true,true).tone).toBe('waiting');
    expect(metricCue(null,5,6,'depth',true,false).tone).toBe('waiting');
  });
});
