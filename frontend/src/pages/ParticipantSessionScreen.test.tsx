import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { appendParticipantChartPoint, ParticipantSessionScreen } from './ParticipantSessionScreen';
import { getParticipantReading } from '../demo/scenario';

describe('ParticipantSessionScreen', () => {
  it('shows equal-sized depth and rate metrics, feedback, and recent graphs', () => {
    const html = renderToStaticMarkup(
      <ParticipantSessionScreen
        mode="demo"
        reading={getParticipantReading(12_000)}
        elapsedSeconds={12}
        connected
        victimType="adult"
        playerCount={2}
        coach={{ severity: 'caution', title: '깊이 교정 필요', action: '조금 더 깊게 압박하세요.', rationale: '현재 4.3cm입니다.', criterion: '성인 권장 깊이 5–6cm · 속도 100–120회/분' }}
      />
    );

    expect(html).toContain('시연 모드');
    expect(html).toContain('가상 센서 데이터');
    expect(html).toContain('스테이션 A');
    expect(html).toContain('4.3');
    expect(html).toContain('조금 더 깊게 압박하세요');
    expect(html).toContain('현재 압박 깊이');
    expect(html).toContain('현재 압박 속도');
    expect(html).toContain('최근 압박 깊이');
    expect(html).toContain('최근 압박 속도');
  });

  it('keeps chart history within the fixed two-minute timeline', () => {
    const first = { time: 119.7, depth: 5.4, bpm: 110 };
    const atLimit = { time: 120, depth: 5.5, bpm: 111 };
    const afterLimit = { time: 120.3, depth: 5.6, bpm: 112 };

    expect(appendParticipantChartPoint([first], atLimit)).toEqual([first, atLimit]);
    expect(appendParticipantChartPoint([first, atLimit], afterLimit)).toEqual([first, atLimit]);
  });

  it('requires target and team selection before opening the live dashboard', () => {
    const html = renderToStaticMarkup(
      <ParticipantSessionScreen
        mode="demo"
        reading={getParticipantReading(12_000)}
        elapsedSeconds={12}
        connected
        victimType="child"
        playerCount={3}
        started={false}
        coach={{ severity: 'good', title: '좋은 압박', action: '현재 리듬을 유지하세요.', rationale: '적정 범위입니다.', criterion: '소아 권장 깊이 4–5cm · 속도 100–120회/분' }}
      />
    );

    expect(html).toContain('실습 설정');
    expect(html).toContain('성인');
    expect(html).toContain('소아');
    expect(html).toContain('영아');
    expect(html).toContain('3명 실습');
    expect(html).toContain('이 설정으로 실습 시작하기');
    expect(html).toContain('대상별 자세·손 모양 먼저 보기');
    expect(html).toContain('시작 전');
    expect(html).not.toContain('00:12');
    expect(html).not.toContain('href="/participant?');
    expect(html).not.toContain('현재 압박 깊이');
  });

  it('shows an end control during practice and a guide link after ending', () => {
    const html = renderToStaticMarkup(
      <ParticipantSessionScreen mode="demo" reading={getParticipantReading(12_000)} elapsedSeconds={12} connected victimType="adult" ended coach={{ severity: 'good', title: '좋은 압박', action: '현재 리듬을 유지하세요.', rationale: '적정 범위입니다.', criterion: '성인 권장 깊이 5–6cm · 속도 100–120회/분' }} />
    );

    expect(html).toContain('실습 종료');
    expect(html).toContain('AI 세션 종합 피드백');
    expect(html).toContain('잘한 점');
    expect(html).toContain('가장 큰 교정');
    expect(html).toContain('다음 라운드 목표');
    expect(html).toContain('분석 범위');
    expect(html).toContain('최종 점수');
    expect(html).toContain('전체 압박 깊이');
    expect(html).toContain('전체 압박 속도');
    expect(html).toContain('대상별 자세·손 모양 다시 보기');
    expect(html).not.toContain('현재 압박 깊이');
  });

  it('flags a meaningful late-session depth decline as a fatigue-possibility signal', () => {
    const history = Array.from({ length: 10 }, (_, index) => ({ time: index * 5, depth: index < 5 ? 5.6 : 4.5, bpm: 110 }));
    const html = renderToStaticMarkup(
      <ParticipantSessionScreen mode="demo" reading={getParticipantReading(45_000)} elapsedSeconds={45} connected victimType="adult" playerCount={2} ended finalResult={{ reading: getParticipantReading(45_000), elapsedSeconds: 45, history }} coach={{ severity: 'good', title: '좋은 압박', action: '현재 리듬을 유지하세요.', rationale: '적정 범위입니다.', criterion: '성인 권장 깊이 5–6cm · 속도 100–120회/분' }} />
    );

    expect(html).toContain('그래프 기반 피로·일관성 분석');
    expect(html).toContain('피로 가능성 신호');
    expect(html).toContain('깊이 20% 감소');
  });
  it('shows mechanical return only while connected and keeps clinical limits explicit', () => {
    const props = { mode: 'live' as const, reading: { ...getParticipantReading(0), recoil: 87 }, elapsedSeconds: 12, connected: true, victimType: 'adult' as const, coach: { severity: 'good' as const, title: '안내', action: '유지', rationale: '기준', criterion: '깊이·속도' } };
    const html = renderToStaticMarkup(<ParticipantSessionScreen {...props} />);
    expect(html).toContain('이완 복귀율');
    expect(html).toContain('87');
    expect(html).toContain('직전 압박의 변위 복귀');
    expect(html).toContain('손 압력·손 위치·환기 품질 미측정');
    const offline = renderToStaticMarkup(<ParticipantSessionScreen {...props} connected={false} />);
    expect(offline).not.toContain('>87<');
    expect(offline).toContain('측정 대기');
    const pending = renderToStaticMarkup(<ParticipantSessionScreen {...props} reading={{ ...props.reading, recoil: null }} />);
    expect(pending).toContain('측정 대기');
  });

});
