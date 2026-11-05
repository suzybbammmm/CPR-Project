import { describe, expect, it } from 'vitest';
import { TEAM_ROUND_MS, TEAM_ROUND_SECONDS, createTeamSession, startTeamRound, recordTeamFrame, finishTeamRound, nextTeamRound, teamGameStats, tickTeamSession } from './teamSession';
import type { SensorReading } from './sensorState';
const frame = (count = 10, overrides: Partial<SensorReading> = {}): SensorReading => ({ type: 'reading', deviceId: 'one', sequence: count, timestamp: count * 500, depth: 0, bpm: 110, compressionCount: count, compressionPeakCm: 5.5, compressionBpm: 110, recoilPercent: 98, accelZ: 0, gyroZ: 0, ...overrides });
describe('team session rounds', () => {
  it.each([1, 2, 3, 4])('finishes exactly %i rounds and freezes results', (players) => {
    let state = startTeamRound(createTeamSession(players, 'adult'), 1000, frame());
    for (let i = 0; i < players; i++) {
      const start = (state.startedAt??0);
      state = finishTeamRound(state, start + TEAM_ROUND_MS);
      expect(state.results).toHaveLength(i + 1);
      expect(state.results[i].elapsedSeconds).toBe(TEAM_ROUND_SECONDS);
      expect(finishTeamRound(state, start + TEAM_ROUND_MS + 10000)).toBe(state);
      if (i < players - 1) { expect(state.phase).toBe('handoff'); state = nextTeamRound(state, start + TEAM_ROUND_MS + 10000, frame()); }
    }
    expect(state.phase).toBe('results');
  });
  it('ignores previous cumulative counts, duplicates, stale data and handoff movement', () => {
    let state = startTeamRound(createTeamSession(2, 'adult'), 1000, frame(50));
    state = recordTeamFrame(state, frame(51), 1100, true, 1100);
    state = recordTeamFrame(state, frame(51), 1200, true, 1100);
    state = recordTeamFrame(state, frame(52), 1300, false, 1300);
    expect(state.events).toHaveLength(1);
    state = finishTeamRound(state, 1400);
    state = recordTeamFrame(state, frame(60), 1500, true, 1500);
    state = nextTeamRound(state, 2000, frame(60));
    state = recordTeamFrame(state, frame(61), 2100, true, 2100);
    expect(state.events).toHaveLength(1);
    expect(state.compressionCount).toBe(1);
  });
  it('records just one known event after a count gap and marks missing events', () => {
    let state = startTeamRound(createTeamSession(1, 'adult'), 1000, frame());
    state = recordTeamFrame(state, frame(14), 1100, true, 1100);
    state = finishTeamRound(state, 1200);
    expect(state.results[0]).toMatchObject({ compressionCount: 4, observedCount: 1, missingCount: 3 });
  });
  it('does not substitute live BPM when completed event BPM is unavailable', () => {
    let state = startTeamRound(createTeamSession(1, 'adult'), 1000, frame());
    state = recordTeamFrame(state, frame(11, { compressionBpm: null, bpm: 110 }), 1100, true, 1100);
    state = finishTeamRound(state, 1200);
    expect(state.results[0]).toMatchObject({ avgDepth: 5.5, avgBpm: null, score: null, rateGoodPercent: null });
  });
  it('handles device/count restarts without inventing compressions', () => {
    let state = startTeamRound(createTeamSession(1, 'adult'), 1000, frame());
    state = recordTeamFrame(state, frame(0), 1100, true, 1100);
    state = recordTeamFrame(state, frame(1), 1200, true, 1200);
    state = recordTeamFrame(state, frame(30, { deviceId: 'two' }), 1300, true, 1300);
    expect(state.events).toHaveLength(1);
    expect(state.compressionCount).toBe(1);
  });
  it('expires before accepting frames at or after deadline even when disconnected', () => {
    let state = startTeamRound(createTeamSession(1, 'adult'), 1000, frame());
    state = recordTeamFrame(state, frame(11), 31000, true, 31000);
    expect(state.phase).toBe('results');
    expect(state.results[0]).toMatchObject({ observedCount: 0, score: null, avgDepth: null });
  });
  it('requires release when a round starts with an existing compression', () => {
    let state = startTeamRound(createTeamSession(1, 'adult'), 1000, frame(10, { depth: 5 }));
    state = recordTeamFrame(state, frame(11), 1100, true, 1100);
    expect(state.events).toHaveLength(0);
    state = recordTeamFrame(state, frame(12), 1200, true, 1200);
    expect(state.events).toHaveLength(1);
  });
});

it('awards XP, resets combos and produces a normalized grade', () => {
 const stats = teamGameStats([{depth:5.5,bpm:110,recoil:100},{depth:5.5,bpm:110,recoil:80},{depth:4.5,bpm:110,recoil:100},{depth:2,bpm:50,recoil:null},{depth:5.5,bpm:null,recoil:null}], 'adult');
 expect(stats).toMatchObject({xp:5,combo:0,maxCombo:2,score:63,grade:'C',scoredCount:4});
 expect(teamGameStats([], 'adult').score).toBeNull();
});
it('automatically freezes exactly once at the 30-second deadline', () => {
 let state=startTeamRound(createTeamSession(2,'adult'),1000,frame());
 expect(tickTeamSession(state,30999).phase).toBe('active');
 state=tickTeamSession(state,31000);
 expect(state.phase).toBe('handoff');
 expect(tickTeamSession(state,200000).results).toHaveLength(1);
});

it('does not score the first compression interval inherited across a handoff', () => {
 let state=startTeamRound(createTeamSession(2,'adult'),1000,frame(50));
 state=recordTeamFrame(state,frame(51,{compressionBpm:110}),1100,true,1100);
 expect(state.events[0].bpm).toBeNull();
 state=recordTeamFrame(state,frame(52,{compressionBpm:110}),1700,true,1700);
 expect(state.events[1].bpm).toBe(110);
});
