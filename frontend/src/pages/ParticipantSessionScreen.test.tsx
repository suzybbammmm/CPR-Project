import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ParticipantSessionScreen } from './ParticipantSessionScreen';
import { getParticipantReading } from '../demo/scenario';

describe('ParticipantSessionScreen', () => {
  it('shows actionable real-time feedback and identifies virtual data', () => {
    const html = renderToStaticMarkup(
      <ParticipantSessionScreen
        mode="demo"
        reading={getParticipantReading(12_000)}
        elapsedSeconds={12}
        connected
      />
    );

    expect(html).toContain('시연 모드');
    expect(html).toContain('가상 센서 데이터');
    expect(html).toContain('스테이션 A');
    expect(html).toContain('4.3');
    expect(html).toContain('조금 더 깊게 압박하세요');
  });
});
