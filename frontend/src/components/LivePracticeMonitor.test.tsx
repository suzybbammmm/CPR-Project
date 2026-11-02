import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LivePracticeMonitor } from './LivePracticeMonitor';

const baseProps = {
  victimLabel: '성인', targetDepth: '5–6cm', handPlacement: '가슴 중앙', depth: 5.4, bpm: 108,
  feedback: '좋습니다. 깊이와 속도를 유지하세요.', feedbackTone: 'good' as const, compressionCount: 42, properPercent: 92,
  coach: { severity: 'good' as const, title: '정상 범위', action: '좋습니다. 현재 리듬을 유지하세요.', rationale: '깊이와 속도가 목표 범위 안입니다.', criterion: '성인 권장 깊이 5–6cm · 속도 100–120회/분' },
  averageDepth: 5.3, averageBpm: 109, score: 42, combo: 12, secondsRemaining: 105,
  playerLabel: '1번 실습자', rotationMessage: '교대 준비 중',
  history: [{ time: '0.0s', depth: 5, bpm: 104, timestamp: 1 }, { time: '0.2s', depth: 5.4, bpm: 108, timestamp: 2 }, { time: '0.4s', depth: 5.2, bpm: 110, timestamp: 3 }],
  onFinish: () => undefined
};

describe('LivePracticeMonitor', () => {
  it('puts measurements, feedback, and two charts on one screen', () => {
    const html = renderToStaticMarkup(<LivePracticeMonitor {...baseProps} />).normalize('NFC');
    for (const text of ['실시간 CPR 실습 모니터', '압박별 최고값', '압박 속도 변화', '직전 압박 최고 깊이', '누적 압박', '적정 압박 비율', 'AI CPR 코치', baseProps.coach.action]) {
      expect(html).toContain(text.normalize('NFC'));
    }
  });

  it('adds game progress and smooth curved chart paths', () => {
    const html = renderToStaticMarkup(<LivePracticeMonitor {...baseProps} />).normalize('NFC');
    expect(html).toContain('오늘의 미션'.normalize('NFC'));
    expect(html).toContain('레벨 3'.normalize('NFC'));
    expect(html).toContain('data-chart-style="smooth"');
    expect(html).toMatch(/<path[^>]+d="M[^"]*C/);
  });

  it('keeps corrective feedback and graphs visible in urgent state', () => {
    const html = renderToStaticMarkup(<LivePracticeMonitor {...baseProps} feedbackTone="urgent" coach={{ ...baseProps.coach, severity: 'caution', action: '압박 속도를 조금 낮추세요.' }} history={[]} />).normalize('NFC');
    expect(html).toContain('압박 속도를 조금 낮추세요.'.normalize('NFC'));
    expect(html).toContain('압박별 최고값'.normalize('NFC'));
  });

  it('explains the capped score and combo rules beside the practice metrics', () => {
    const html = renderToStaticMarkup(<LivePracticeMonitor {...baseProps} score={42} />).normalize('NFC');
    for (const rule of ['점수 · 콤보 기준', '최대 100점', '정확 압박 +2점', '기준 범위를 벗어나면 콤보 초기화']) {
      expect(html).toContain(rule.normalize('NFC'));
    }
  });

  it('labels depth as the latest completed compression peak', () => {
    const html = renderToStaticMarkup(<LivePracticeMonitor {...baseProps} />).normalize('NFC');
    expect(html).toContain('직전 압박 최고 깊이'.normalize('NFC'));
    expect(html).toContain('압박별 최고값'.normalize('NFC'));
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

});
