export type Audience = 'launcher' | 'participant' | 'instructor' | 'game' | 'guide' | 'leaderboard' | 'admin';
export type RuntimeMode = 'demo' | 'live';
import type { VictimType } from '../utils/cprGuidance';

export interface RuntimeConfig {
  audience: Audience;
  mode: RuntimeMode;
  victimType: VictimType;
  playerCount: number;
  started: boolean;
}

export interface ShowcaseLinks {
  participantDemo: string;
  instructorDemo: string;
  participantLive: string;
  instructorLive: string;
  game: string;
}

function normalizePath(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path.toLowerCase();
}

export function getRuntimeConfig(pathname: string, search: string): RuntimeConfig {
  const path = normalizePath(pathname);
  const parameters = new URLSearchParams(search);
  const requestedMode = parameters.get('mode');
  const mode: RuntimeMode = requestedMode === 'live' ? 'live' : 'demo';
  const requestedVictim = parameters.get('victim');
  const victimType: VictimType = requestedVictim === 'child' || requestedVictim === 'infant' ? requestedVictim : 'adult';
  const requestedPlayers = Number(parameters.get('players'));
  const playerCount = [1, 2, 3, 4].includes(requestedPlayers) ? requestedPlayers : 1;
  const started = parameters.get('start') === '1';

  if (path === '/participant') return { audience: 'participant', mode, victimType, playerCount, started };
  if (path === '/instructor') return { audience: 'instructor', mode, victimType, playerCount, started };
  if (path === '/game') return { audience: 'game', mode, victimType, playerCount, started };
  if (path === '/guide') return { audience: 'guide', mode: 'demo', victimType: 'adult', playerCount: 1, started: false };
  if (path === '/leaderboard') return { audience: 'leaderboard', mode: 'demo', victimType: 'adult', playerCount: 1, started: false };
  if (path === '/admin') return { audience: 'admin', mode: 'demo', victimType: 'adult', playerCount: 1, started: false };
  return { audience: 'launcher', mode: 'demo', victimType, playerCount, started };
}

export function getShowcaseLinks(origin: string): ShowcaseLinks {
  const base = origin.replace(/\/+$/, '');
  return {
    participantDemo: `${base}/participant?mode=demo`,
    instructorDemo: `${base}/instructor?mode=demo`,
    participantLive: `${base}/participant?mode=live`,
    instructorLive: `${base}/instructor?mode=live`,
    game: `${base}/game`
  };
}
