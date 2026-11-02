import { describe, expect, it } from 'vitest';
import { getRuntimeConfig, getShowcaseLinks } from './runtime';

describe('getRuntimeConfig', () => {
  it('opens the role launcher when no role path is provided', () => {
    expect(getRuntimeConfig('/', '')).toEqual({
      audience: 'launcher',
      mode: 'demo',
      victimType: 'adult', playerCount: 1, started: false
    });
  });

  it('selects a self-contained participant demo from the URL', () => {
    expect(getRuntimeConfig('/participant', '?mode=demo')).toEqual({
      audience: 'participant',
      mode: 'demo', victimType: 'adult', playerCount: 1, started: false
    });
  });

  it('selects the real sensor path only when live is explicit', () => {
    expect(getRuntimeConfig('/participant', '?mode=live')).toEqual({
      audience: 'participant',
      mode: 'live', victimType: 'adult', playerCount: 1, started: false
    });
  });

  it('supports an independent instructor screen and rejects unknown modes', () => {
    expect(getRuntimeConfig('/instructor/', '?mode=live')).toEqual({
      audience: 'instructor',
      mode: 'live', victimType: 'adult', playerCount: 1, started: false
    });
    expect(getRuntimeConfig('/instructor', '?mode=unknown')).toEqual({
      audience: 'instructor',
      mode: 'demo', victimType: 'adult', playerCount: 1, started: false
    });
  });

  it('keeps the original gameplay flow reachable in demo and live modes', () => {
    expect(getRuntimeConfig('/game', '')).toEqual({
      audience: 'game',
      mode: 'demo', victimType: 'adult', playerCount: 1, started: false
    });
    expect(getRuntimeConfig('/game', '?mode=live')).toEqual({
      audience: 'game',
      mode: 'live', victimType: 'adult', playerCount: 1, started: false
    });
  });

  it('opens a dedicated technique guide with no live sensor dependency', () => {
    expect(getRuntimeConfig('/guide', '')).toEqual({
      audience: 'guide', mode: 'demo', victimType: 'adult', playerCount: 1, started: false
    });
  });

  it('reads a supported victim type and falls back safely to adult', () => {
    expect(getRuntimeConfig('/participant', '?mode=live&victim=child').victimType).toBe('child');
    expect(getRuntimeConfig('/instructor', '?victim=infant').victimType).toBe('infant');
    expect(getRuntimeConfig('/game', '?victim=unknown').victimType).toBe('adult');
  });

  it('reads a supported team size and falls back safely to one person', () => {
    expect(getRuntimeConfig('/participant', '?players=3').playerCount).toBe(3);
    expect(getRuntimeConfig('/participant', '?players=8').playerCount).toBe(1);
  });

  it('starts only when the start flag is explicit', () => {
    expect(getRuntimeConfig('/participant', '?start=1').started).toBe(true);
    expect(getRuntimeConfig('/participant', '?start=yes').started).toBe(false);
  });
});

describe('getShowcaseLinks', () => {
  it('builds stable URLs that can be opened on two devices', () => {
    expect(getShowcaseLinks('http://localhost:5173')).toEqual({
      participantDemo: 'http://localhost:5173/participant?mode=demo',
      instructorDemo: 'http://localhost:5173/instructor?mode=demo',
      participantLive: 'http://localhost:5173/participant?mode=live',
      instructorLive: 'http://localhost:5173/instructor?mode=live',
      game: 'http://localhost:5173/game'
    });
  });
});
