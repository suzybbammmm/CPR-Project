import type { ParticipantChartPoint } from '../pages/ParticipantSessionScreen';
import { CPR_PROFILES, type VictimType } from '../utils/cprGuidance';
import { calculatePoints } from '../utils/scoring';
import { calculateGrade } from '../utils/grading';
import type { SensorReading } from './sensorState';
import type { ParticipantInfo } from '../types/exhibition.types';

export const TEAM_ROUND_MS = 120_000;
export type TeamPhase = 'setup' | 'active' | 'handoff' | 'results';
export interface TeamEvent { depth: number; bpm: number | null; recoil: number | null; points?: number; combo?: number }
export interface TeamRoundResult {
  playerIndex: number;
  participant?: ParticipantInfo;
  attemptUuid: string;
  elapsedSeconds: number;
  compressionCount: number;
  observedCount: number;
  missingCount: number;
  score: number | null;
  xp?: number; maxCombo?: number; grade?: string | null;
  avgDepth: number | null;
  avgBpm: number | null;
  avgRecoil: number | null;
  depthGoodPercent: number | null;
  rateGoodPercent: number | null;
  history: ParticipantChartPoint[];
}
export interface TeamSession {
  phase: TeamPhase;
  playerCount: number;
  victimType: VictimType;
  currentPlayerIndex: number;
  startedAt: number | null;
  events: TeamEvent[];
  history: ParticipantChartPoint[];
  compressionCount: number;
  missingCount: number;
  previousFrame: SensorReading | null;
  lastReceivedAt: number | null;
  armed: boolean;
  results: TeamRoundResult[];
  participants: ParticipantInfo[];
  sessionUuid: string;
}
export function createTeamSession(playerCount: number, victimType: VictimType): TeamSession {
  return { phase: 'setup', playerCount: Math.max(1, Math.min(4, Math.trunc(playerCount))), victimType, currentPlayerIndex: 0, startedAt: null, events: [], history: [], compressionCount: 0, missingCount: 0, previousFrame: null, lastReceivedAt: null, armed: false, results: [], participants: [], sessionUuid: crypto.randomUUID() };
}
export function startTeamRound(state: TeamSession, now: number, baseline: SensorReading | null): TeamSession {
  if (state.phase !== 'setup' && state.phase !== 'handoff') return state;
  return { ...state, phase: 'active', startedAt: now, events: [], history: [], compressionCount: 0, missingCount: 0, previousFrame: baseline, lastReceivedAt: null, armed: baseline !== null && baseline.depth <= 0.5 };
}
const average = (values: number[]): number | null => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
export function summarizeTeamRound(state: TeamSession, now: number): TeamRoundResult {
  const target = CPR_PROFILES[state.victimType].targetDepthCm;
  const depthGood = (event: TeamEvent) => event.depth >= target.min && event.depth <= target.max;
  const rates = state.events.filter((event) => event.bpm !== null && event.bpm > 0);
  const rateGood = (event: TeamEvent) => (event.bpm??0) >= 100 && (event.bpm??0) <= 120;
  return {
    playerIndex: state.currentPlayerIndex,
    participant: state.participants[state.currentPlayerIndex],
    attemptUuid: crypto.randomUUID(),
    elapsedSeconds: Math.min(TEAM_ROUND_MS, Math.max(0, now - (state.startedAt ?? now))) / 1000,
    compressionCount: state.compressionCount, observedCount: state.events.length, missingCount: state.missingCount,
    ...teamGameStats(state.events, state.victimType),
    avgDepth: average(state.events.map((event) => event.depth)), avgBpm: average(rates.map((event) => (event.bpm??0))),
    avgRecoil: average(state.events.flatMap((event) => event.recoil === null ? [] : [event.recoil])),
    depthGoodPercent: state.events.length ? Math.round(100 * state.events.filter(depthGood).length / state.events.length) : null,
    rateGoodPercent: rates.length ? Math.round(100 * rates.filter(rateGood).length / rates.length) : null,
    history: state.history
  };
}
export function finishTeamRound(state: TeamSession, now: number): TeamSession {
  if (state.phase !== 'active') return state;
  return { ...state, phase: state.currentPlayerIndex + 1 < state.playerCount ? 'handoff' : 'results', results: [...state.results, summarizeTeamRound(state, now)] };
}
export function nextTeamRound(state: TeamSession, now: number, baseline: SensorReading | null): TeamSession {
  if (state.phase !== 'handoff') return state;
  return startTeamRound({ ...state, currentPlayerIndex: state.currentPlayerIndex + 1 }, now, baseline);
}
export function tickTeamSession(state: TeamSession, now: number): TeamSession {
  return state.phase === 'active' && state.startedAt !== null && now - state.startedAt >= TEAM_ROUND_MS ? finishTeamRound(state, state.startedAt + TEAM_ROUND_MS) : state;
}
export function recordTeamFrame(state: TeamSession, frame: SensorReading, now: number, online: boolean, receivedAt: number): TeamSession {
  const current = tickTeamSession(state, now);
  if (current.phase !== 'active' || current.startedAt === null || !online || receivedAt < current.startedAt || now - receivedAt >= 1000 || receivedAt === current.lastReceivedAt) return current;
  const previous = current.previousFrame;
  // Reordered packets cannot become new completed events. A restarted counter,
  // device or clock establishes a fresh baseline instead of producing a count gap.
  const restarted = !previous || frame.deviceId !== previous.deviceId || frame.compressionCount < previous.compressionCount || frame.timestamp < previous.timestamp;
  if (previous && !restarted && frame.sequence > 0 && previous.sequence > 0 && frame.sequence <= previous.sequence) return current;
  const history = [...current.history, { time: Math.min(120, (receivedAt - current.startedAt) / 1000), depth: frame.depth, bpm: frame.bpm }];
  const next = { ...current, history, previousFrame: frame, lastReceivedAt: receivedAt };
  if (restarted || !current.armed) return { ...next, armed: frame.depth <= 0.5 };
  const difference = frame.compressionCount - (previous?.compressionCount??frame.compressionCount);
  if (difference <= 0) return next;
  return {
    ...next, compressionCount: current.compressionCount + difference, missingCount: current.missingCount + difference - 1,
    // Only the last completed peak is transmitted; intermediate peaks are unknown.
    events: [...current.events, { depth: frame.compressionPeakCm, bpm: current.events.length > 0 && frame.compressionBpm !== null && frame.compressionBpm > 0 ? frame.compressionBpm : null, recoil: frame.recoilPercent }]
  };
}

export function teamGameStats(events: TeamEvent[], victimType: VictimType) {
 let xp=0, combo=0, maxCombo=0, scoredCount=0;
 for (const event of events) {
   if (event.bpm === null || event.bpm <= 0) { combo=0; continue; }
   const result=calculatePoints(event.depth,event.bpm,combo,victimType);
   xp+=result.points;combo=result.newCombo;maxCombo=Math.max(maxCombo,combo);scoredCount++;
 }
 const score=scoredCount ? Math.round(100*xp/(2*scoredCount)) : null;
 return {xp,combo,maxCombo,scoredCount,score,grade:score===null?null:calculateGrade(score)};
}

/** Build compression_events array ready to POST to /api/v1/attempts */
export function buildCompressionPayload(events: TeamEvent[], victimType: VictimType) {
 let combo=0;
 return events.map((event,i)=>{
   if(event.bpm===null||event.bpm<=0){combo=0;return{seq:i,depth_cm:event.depth,bpm:event.bpm,recoil_pct:event.recoil,points:0,combo_at:0};}
   const result=calculatePoints(event.depth,event.bpm??0,combo,victimType);
   combo=result.newCombo;
   return{seq:i,depth_cm:event.depth,bpm:event.bpm,recoil_pct:event.recoil,points:result.points,combo_at:combo};
 });
}
