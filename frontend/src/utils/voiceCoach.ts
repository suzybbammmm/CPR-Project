export interface VoiceNotice { text: string; kind: 'correction' | 'good' | 'waiting' | 'offline' }
export interface VoiceTiming { lastText: string; lastAt: number; pendingText: string; pendingSince: number }

// Let a changed instruction settle before speaking; never queue every compression.
export function shouldSpeakCoach(notice: VoiceNotice, timing: VoiceTiming, now: number): boolean {
  if (notice.text !== timing.pendingText || now - timing.pendingSince < 800) return false;
  const changed = notice.text !== timing.lastText;
  const gap = changed && notice.kind === 'offline' ? 0 : changed ? 3500 : notice.kind === 'good' || notice.kind === 'offline' ? 15000 : 8000;
  return now - timing.lastAt >= gap;
}
