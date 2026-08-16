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
    expect(html).toContain('압박 이완 비율');
    expect(html).toContain('긴급 경고');
  });
});
