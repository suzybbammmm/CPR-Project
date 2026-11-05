import { describe, expect, it } from 'vitest';
import { assessPracticeCompression, practiceDisplayAssessment, metricCue, practiceBonus } from './practiceGame';
const exact = { depth: 5.5, bpm: 110, recoil: null };
describe('practice display bonus', () => {
  it('doubles at milestones and caps at eight', () => {
    for (const [count, gamePoints, multiplier] of [[4,80,1],[5,120,2],[10,360,4],[20,1240,8],[21,1400,8]]) {
      expect(practiceBonus(Array(count).fill(exact), 'adult')).toMatchObject({ gamePoints, multiplier });
    }
  });
  it('keeps GOOD combo, and resets on MISS or unknown rate', () => {
    const streak = Array(5).fill(exact);
    expect(practiceBonus([...streak,{...exact,bpm:null},exact], 'adult')).toMatchObject({gamePoints:140,multiplier:1});
    expect(practiceBonus([...streak,{...exact,bpm:130},exact], 'adult')).toMatchObject({gamePoints:190,combo:7});
    expect(practiceBonus([...streak,{...exact,depth:1,bpm:50},exact], 'adult').gamePoints).toBe(140);
  });
  it('uses the selected depth profile', () => {
    expect(practiceBonus(Array(5).fill({...exact,depth:4}), 'child').multiplier).toBe(2);
    expect(practiceBonus(Array(5).fill({...exact,depth:4}), 'adult').multiplier).toBe(1);
  });
  it('matches the five-stage examples and point table', () => {
    expect(assessPracticeCompression({depth:5.4,bpm:110,recoil:null},'adult')).toMatchObject({judgement:'perfect',matchPercent:100,basePoints:20});
    expect(assessPracticeCompression({depth:5.4,bpm:125,recoil:null},'adult')).toMatchObject({judgement:'great',matchPercent:75,basePoints:15});
    expect(assessPracticeCompression({depth:4.5,bpm:110,recoil:null},'adult')).toMatchObject({judgement:'great',matchPercent:75,basePoints:15});
    expect(assessPracticeCompression({depth:4.25,bpm:110,recoil:null},'adult')).toMatchObject({judgement:'great',matchPercent:75,basePoints:15});
    expect(assessPracticeCompression({depth:4,bpm:130,recoil:null},'adult')).toMatchObject({judgement:'good',matchPercent:50,basePoints:10});
  });
  it('applies the requested combo transitions and recoil qualifier', () => {
    expect(assessPracticeCompression({depth:4,bpm:130,recoil:null},'adult',7).combo).toBe(7);
    expect(assessPracticeCompression({depth:4.25,bpm:110,recoil:null},'adult',7).combo).toBe(8);
    expect(assessPracticeCompression({depth:4.5,bpm:110,recoil:null},'adult',7).combo).toBe(8);
    expect(assessPracticeCompression({depth:5.4,bpm:125,recoil:null},'adult',7).combo).toBe(8);
    expect(assessPracticeCompression({depth:5.4,bpm:110,recoil:89},'adult',7)).toMatchObject({judgement:'perfect',combo:8,basePoints:20,recoilLimited:false});
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

it.each([
 [5,100,'perfect'],[6,120,'perfect'],[4.25,85,'great'],[4.99,99,'great'],[6.01,121,'great'],[6.90,138,'great'],
 [3.50,70,'good'],[4.24,84,'good'],[6.91,139,'good'],[7.80,156,'good'],
 [2.75,55,'bad'],[3.49,69,'bad'],[7.81,157,'bad'],[8.70,174,'bad'],
 [2.74,110,'miss'],[8.71,110,'miss'],[5.4,54,'miss'],[5.4,175,'miss'],
 [5.4,110,'perfect'],[4.5,110,'great'],[5.4,130,'great'],[4,145,'good']
])('grades depth %s and BPM %s as %s', (depth,bpm,judgement)=>{
 expect(assessPracticeCompression({depth:Number(depth),bpm:Number(bpm),recoil:80},'adult').judgement).toBe(judgement);
});

it.each([[5.4,110,'perfect'],[4.5,110,'great'],[5.4,130,'great'],[4,145,'good']])('previews peak %s at %s and holds through release', (depth,bpm,judgement)=>{
 const history=[{depth:0.7,bpm:Number(bpm)},{depth:Number(depth),bpm:Number(bpm)}];
 expect(practiceDisplayAssessment(history,0.7,Number(bpm),'adult').assessment.judgement).toBe(judgement);
});
it('marks depth-only previews and never conceals a measured MISS',()=>{
 expect(practiceDisplayAssessment([],5.4,0,'adult')).toMatchObject({depthOnly:true,assessment:{judgement:'perfect'}});
 const completed=assessPracticeCompression({depth:5.4,bpm:50,recoil:null},'adult');
 expect(practiceDisplayAssessment([],0,110,'adult',completed,5.4,50).assessment.judgement).toBe('miss');
});
