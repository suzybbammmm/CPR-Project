import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LivePracticeMonitor } from './LivePracticeMonitor';

const baseProps = {
  victimLabel: '성인', targetDepth: '5–6cm', targetDepthRange: [5,6] as [number,number], handPlacement: '가슴 중앙', connected: true, depth: 5.4, bpm: 108,
  feedback: '좋습니다. 깊이와 속도를 유지하세요.', feedbackTone: 'good' as const, compressionCount: 42, properPercent: 92,
  coach: { severity: 'good' as const, title: '정상 범위', action: '좋습니다. 현재 리듬을 유지하세요.', rationale: '깊이와 속도가 목표 범위 안입니다.', criterion: '성인 권장 깊이 5–6cm · 속도 100–120회/분' },
  averageDepth: 5.3, averageBpm: 109, score: 420, accuracyScore: 92, grade: 'S', combo: 12,
  judgement: 'perfect' as const, matchPercent: 100, depthScore: 100, rateScore: 100, recoilLimited: false, secondsRemaining: 18,
  playerLabel: '1번 실습자', rotationMessage: '교대 준비 중',
  history: [{ time: '0.0s', depth: 5, bpm: 104, timestamp: 1 }, { time: '0.2s', depth: 5.4, bpm: 108, timestamp: 2 }, { time: '0.4s', depth: 5.2, bpm: 110, timestamp: 3 }],
  onFinish: () => undefined
};

describe('LivePracticeMonitor', () => {
  it('puts measurements, feedback, and two charts on one screen', () => {
    const html = renderToStaticMarkup(<LivePracticeMonitor {...baseProps} />).normalize('NFC');
    for (const text of ['실시간 CPR 실습 모니터', '실시간 압박 깊이', '실시간 압박 깊이', '누적 압박', '적정 압박 비율', 'AI CPR 코치', baseProps.coach.action]) {
      expect(html).toContain(text.normalize('NFC'));
    }
  });

  it('keeps game progress without live graphs', () => {
    const html = renderToStaticMarkup(<LivePracticeMonitor {...baseProps} />).normalize('NFC');
    expect(html).toContain('오늘의 미션'.normalize('NFC'));
    expect(html).toContain('레벨 5'.normalize('NFC'));
    expect(html).not.toContain('실시간 압박 그래프');
    expect(html).not.toContain('data-chart-style="smooth"');
  });

  it('keeps corrective feedback and graphs visible in urgent state', () => {
    const html = renderToStaticMarkup(<LivePracticeMonitor {...baseProps} bpm={130} judgement="good" matchPercent={80} rateScore={80} feedback="압박 속도를 조금 낮추세요." feedbackTone="urgent" coach={{ ...baseProps.coach, severity: 'caution', action: '압박 속도를 조금 낮추세요.' }} history={[]} />).normalize('NFC');
    expect(html).toContain('압박 속도를 조금 낮추세요.'.normalize('NFC'));
    expect(html).toContain('실시간 압박 깊이'.normalize('NFC'));
  });

  it('explains the capped score and combo rules beside the practice metrics', () => {
    const html = renderToStaticMarkup(<LivePracticeMonitor {...baseProps} score={42} />).normalize('NFC');
    for (const rule of ['PERFECT 100점', 'GREAT 75점', 'GOOD 50점', 'BAD 25점', 'MISS 0점', 'MISS·BAD 콤보 초기화', 'GOOD 유지', 'GREAT·PERFECT +1']) {
      expect(html).toContain(rule.normalize('NFC'));
    }
  });

  it('labels depth as the latest completed compression peak', () => {
    const html = renderToStaticMarkup(<LivePracticeMonitor {...baseProps} />).normalize('NFC');
    expect(html).toContain('실시간 압박 깊이');
    expect(html).toContain('실시간 압박 깊이'.normalize('NFC'));
    expect(html).not.toContain(String.fromCodePoint(0xae30, 0x1111, 0xc774));
  });
  it('renders the last-cycle mechanical return and a pending state for missing data', () => {
    const html = renderToStaticMarkup(<LivePracticeMonitor {...baseProps} recoil={87} />);
    expect(html).toContain('이완 복귀율');
    expect(html).toContain('87');
    expect(html).toContain('직전 압박의 변위 복귀');
    expect(html).toContain('손 압력·손 위치·환기 품질 미측정');
    const pending = renderToStaticMarkup(<LivePracticeMonitor {...baseProps} recoil={null} />);
    expect(pending).toContain('측정 대기');
    expect(pending).toContain('—');
  });

  it('changes recoil, progress and rhythm states from live criteria',()=>{
    const caution=renderToStaticMarkup(<LivePracticeMonitor {...baseProps} recoil={85} depth={4.4} bpm={92} judgement="bad" matchPercent={76} depthScore={76} rateScore={84} secondsRemaining={4}/>);
    for(const text of ['조금 더 이완하세요','마지막 4초','리듬을 더 빠르게','BAD']) expect(caution).toContain(text);
    const waiting=renderToStaticMarkup(<LivePracticeMonitor {...baseProps} connected={false} recoil={null} compressionCount={0} judgement="miss" matchPercent={0} depthScore={0} rateScore={0}/>);
    for(const text of ['센서 연결 대기','SENSOR WAIT','센서 연결을 확인하세요']) expect(waiting).toContain(text);
  });

  it('shows GOOD for live target depth and PERFECT when rhythm also matches',()=>{
    const good=renderToStaticMarkup(<LivePracticeMonitor {...baseProps} depth={5} bpm={90} judgement="good" matchPercent={80} depthScore={100} rateScore={80}/>);
    expect(good).toContain('GOOD');
    expect(good).toContain('기준에 가까워요');
    const perfect=renderToStaticMarkup(<LivePracticeMonitor {...baseProps} depth={5.5} bpm={110} judgement="perfect" matchPercent={100} depthScore={100} rateScore={100}/>);
    expect(perfect).toContain('PERFECT');
    expect(perfect).toContain('완벽한 압박');
  });

});

it('shows depth judgement instead of PRESSING before rate is available',()=>{
 const props={...baseProps,compressionCount:0,bpm:0,assessmentPending:true,history:[]};
 expect(renderToStaticMarkup(<LivePracticeMonitor {...props} depth={0}/>)).toContain('>READY<');
 const pressing=renderToStaticMarkup(<LivePracticeMonitor {...props} depth={2}/>);
 expect(pressing).toContain('>PERFECT<');
 expect(pressing).toContain('압박 중 · 측정 중');
 expect(pressing).not.toContain('>READY<');
 expect(pressing).not.toContain('PRESSING');
 expect(pressing).toContain('깊이 기준 임시 판정');
 const released=renderToStaticMarkup(<LivePracticeMonitor {...props} depth={0} history={[{time:'0.1',timestamp:100,depth:2,bpm:0}]}/>);
 expect(released).toContain('>PERFECT<');
 const measured=renderToStaticMarkup(<LivePracticeMonitor {...props} compressionCount={2} bpm={110} assessmentPending={false} judgement="perfect"/>);
 expect(measured).toContain('>PERFECT<');
});
