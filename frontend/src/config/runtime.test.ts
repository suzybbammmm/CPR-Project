import { describe, expect, it } from 'vitest';
import { getRuntimeConfig, getShowcaseLinks } from './runtime';

describe('getRuntimeConfig', () => {
  it('opens the role launcher when no role path is provided', () => {
    expect(getRuntimeConfig('/', '')).toEqual({
      audience: 'launcher',
      mode: 'demo'
    });
  });

  it('selects a self-contained participant demo from the URL', () => {
    expect(getRuntimeConfig('/participant', '?mode=demo')).toEqual({
      audience: 'participant',
      mode: 'demo'
    });
  });

  it('selects the real sensor path only when live is explicit', () => {
    expect(getRuntimeConfig('/participant', '?mode=live')).toEqual({
      audience: 'participant',
      mode: 'live'
    });
  });

  it('supports an independent instructor screen and rejects unknown modes', () => {
    expect(getRuntimeConfig('/instructor/', '?mode=live')).toEqual({
      audience: 'instructor',
      mode: 'live'
    });
    expect(getRuntimeConfig('/instructor', '?mode=unknown')).toEqual({
      audience: 'instructor',
      mode: 'demo'
    });
  });
});

describe('getShowcaseLinks', () => {
  it('builds stable URLs that can be opened on two devices', () => {
    expect(getShowcaseLinks('http://localhost:5173')).toEqual({
      participantDemo: 'http://localhost:5173/participant?mode=demo',
      instructorDemo: 'http://localhost:5173/instructor?mode=demo',
      participantLive: 'http://localhost:5173/participant?mode=live',
      instructorLive: 'http://localhost:5173/instructor?mode=live'
    });
  });
});
