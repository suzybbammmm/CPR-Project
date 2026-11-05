import type { TeamEvent } from '../live/teamSession';
import type { VictimType } from './cprGuidance';
import { calculatePoints } from './scoring';

export const comboMultiplier = (combo: number) => combo >= 20 ? 8 : combo >= 10 ? 4 : combo >= 5 ? 2 : 1;

// Presentation-only bonus. Sensor processing and the saved accuracy score stay unchanged.
export function practiceBonus(events: TeamEvent[], victimType: VictimType) {
  let combo = 0, gamePoints = 0;
  for (const event of events) {
    if (event.bpm === null || event.bpm <= 0) { combo = 0; continue; }
    const result = calculatePoints(event.depth, event.bpm, combo, victimType);
    combo = result.newCombo;
    gamePoints += result.points * 10 * comboMultiplier(combo);
  }
  return { eventCount: events.length, assessmentBpm: events.at(-1)?.bpm ?? null, gamePoints, multiplier: comboMultiplier(combo), assessmentDepth: events.at(-1)?.depth ?? null };
}

export function metricCue(value: number | null, min: number, max: number, kind: 'depth' | 'rate', available: boolean, started: boolean) {
  if (!available) return { tone: 'waiting', text: '센서 연결을 확인하세요' };
  if (!started || value === null || !Number.isFinite(value) || (kind === 'rate' && value <= 0)) return { tone: 'waiting', text: kind === 'depth' ? '압박을 시작하세요' : '속도를 측정하고 있어요' };
  if (value < min) return { tone: 'adjust', text: kind === 'depth' ? '더 깊게 누르세요!' : '속도를 더 올리세요!' };
  if (value > max) return { tone: 'adjust', text: kind === 'depth' ? '조금 얕게 누르세요!' : '속도를 조금 낮추세요!' };
  return { tone: 'good', text: kind === 'depth' ? '좋아요! 이 깊이를 유지하세요' : '좋아요! 이 속도를 유지하세요' };
}
