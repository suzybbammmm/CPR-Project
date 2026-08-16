import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LivePracticeMonitor } from './LivePracticeMonitor';

describe('LivePracticeMonitor', () => {
  it('puts current measurements, two trend charts, and corrective feedback on one practice screen', () => {
    const html = renderToStaticMarkup(
      <LivePracticeMonitor
        victimLabel="성인"
        targetDepth="5–6cm"
        handPlacement="가슴 중앙에 양손"
        depth={5.4}
        bpm={108}
        feedback="좋습니다. 깊이와 속도를 유지하세요."
        feedbackTone="good"
        compressionCount={42}
        properPercent={92}
        averageDepth={5.3}
        averageBpm={109}
        score={720}
        combo={12}
        secondsRemaining={105}
        playerLabel="1번 실습자"
        rotationMessage="다음 교대까지 1:45"
        history={[
          { time: '0.0s', depth: 0, bpm: 108, timestamp: 1 },
          { time: '0.2s', depth: 5.4, bpm: 108, timestamp: 2 }
        ]}
      />
    );

    expect(html).toContain('실시간 CPR 실습 모니터');
    expect(html).toContain('압박 깊이 변화');
    expect(html).toContain('압박 속도 변화');
    expect(html).toContain('현재 압박 깊이');
    expect(html).toContain('누적 압박');
    expect(html).toContain('적정 압박 비율');
    expect(html).toContain('좋습니다. 깊이와 속도를 유지하세요.');
  });
});
