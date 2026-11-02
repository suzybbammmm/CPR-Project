import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { buildDemoSession } from '../demo/scenario';
import { InstructorDashboardScreen } from './InstructorDashboardScreen';

describe('InstructorDashboardScreen', () => {
  it('renders eight stations, documented metrics and the urgent alert', () => {
    const html = renderToStaticMarkup(
      <InstructorDashboardScreen
        mode="demo"
        session={buildDemoSession(48_000)}
        selectedLearnerId="learner-1"
        onSelectLearner={() => undefined}
      />
    );

    expect(html).toContain('시연 모드');
    expect(html).toContain('실시간 수행 현황');
    expect(html).toContain('스테이션 A');
    expect(html).toContain('스테이션 H');
    expect(html).toContain('가슴 압박 깊이');
    expect(html).toContain('이완 복귀율');
    expect(html).toContain('긴급 경고');
  });

  it('does not invent a recoil measurement in live mode', () => {
    const session = buildDemoSession(0);
    const liveSession = {
      ...session,
      learners: [{
        ...session.learners[0],
        metrics: { ...session.learners[0].metrics, recoil: null }
      }]
    };
    const html = renderToStaticMarkup(
      <InstructorDashboardScreen
        mode="live"
        session={liveSession}
        selectedLearnerId="learner-1"
        onSelectLearner={() => undefined}
      />
    );

    expect(html).toContain('—');
    expect(html).not.toContain('0% 이완');
  });
  it('shows return as a reference value and hides it after disconnection', () => {
    const session = buildDemoSession(0);
    const liveSession = { ...session, learners: [{ ...session.learners[0], metrics: { ...session.learners[0].metrics, recoil: 87 } }] };
    const props = { mode: 'live' as const, session: liveSession, selectedLearnerId: 'learner-1', onSelectLearner: () => undefined };
    const html = renderToStaticMarkup(<InstructorDashboardScreen {...props} connected />);
    expect(html).toContain('87%');
    expect(html).toContain('변위 기준 참고값');
    expect(html).not.toContain('90% 이상');
    expect(html).toContain('손 압력·손 위치·환기 품질 미측정');
    const offline = renderToStaticMarkup(<InstructorDashboardScreen {...props} connected={false} />);
    expect(offline.replace(/<[^>]*>/g, '')).not.toContain('87%');
    expect(offline).not.toContain('>87</strong>');
    expect(offline).toContain('측정 대기');
  });

});
