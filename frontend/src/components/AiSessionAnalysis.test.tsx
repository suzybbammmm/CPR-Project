import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AiSessionAnalysis } from './AiSessionAnalysis';

describe('AiSessionAnalysis', () => {
  it('explains a completed session from compression peaks and discloses limits', () => {
    const html = renderToStaticMarkup(<AiSessionAnalysis result={{
      playerNumber: 1, score: 80, grade: 'A', properCompressionPercent: 80, avgDepth: 5.4, avgBpm: 110, maxCombo: 4,
      victimType: 'adult', dataHistory: [], compressionPeaks: [
        { time: '0', depth: 5.2, bpm: 105, timestamp: 1 }, { time: '1', depth: 5.6, bpm: 112, timestamp: 2 }
      ]
    }} />).normalize('NFC');

    for (const text of ['AI 세션 분석', '잘한 점', '가장 중요한 교정', '다음 라운드 목표', '그래프 해석', '이완·손 위치·환기 품질은 분석 대상이 아닙니다.']) {
      expect(html).toContain(text);
    }
  });
});
