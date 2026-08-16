export type Audience = 'launcher' | 'participant' | 'instructor';
export type RuntimeMode = 'demo' | 'live';

export interface RuntimeConfig {
  audience: Audience;
  mode: RuntimeMode;
}

export interface ShowcaseLinks {
  participantDemo: string;
  instructorDemo: string;
  participantLive: string;
  instructorLive: string;
}

function normalizePath(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path.toLowerCase();
}

export function getRuntimeConfig(pathname: string, search: string): RuntimeConfig {
  const path = normalizePath(pathname);
  const requestedMode = new URLSearchParams(search).get('mode');
  const mode: RuntimeMode = requestedMode === 'live' ? 'live' : 'demo';

  if (path === '/participant') return { audience: 'participant', mode };
  if (path === '/instructor') return { audience: 'instructor', mode };
  return { audience: 'launcher', mode: 'demo' };
}

export function getShowcaseLinks(origin: string): ShowcaseLinks {
  const base = origin.replace(/\/+$/, '');
  return {
    participantDemo: `${base}/participant?mode=demo`,
    instructorDemo: `${base}/instructor?mode=demo`,
    participantLive: `${base}/participant?mode=live`,
    instructorLive: `${base}/instructor?mode=live`
  };
}
