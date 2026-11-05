export interface ParticipantInfo {
  studentNumber: string;
  name: string;
  phone?: string;
}

export interface AttemptPayload {
  attemptUuid: string;
  sessionUuid: string;
  studentNumber: string;
  name: string;
  phone?: string;
  playerOrder: number;
  elapsedSeconds: number;
  victimType: string;
  score: number | null;
  compressionEvents: CompressionEventPayload[];
  scoringVersion?: number;
}

export interface CompressionEventPayload {
  seq: number;
  depth_cm: number;
  bpm: number | null;
  recoil_pct: number | null;
  points: number;
  combo_at: number;
}

export interface SaveAttemptResult {
  attemptId: number;
  score: number | null;
  grade: string | null;
  xp: number;
  maxCombo: number;
  scoreCorrected: boolean;
  existing: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  maskedName: string;
  maskedStudentNumber: string;
  score: number | null;
  grade: string | null;
  xp: number;

  maxCombo: number;
  depthGoodPercent: number;
  rateGoodPercent: number;
  attemptCount: number;
  achievedAt: string;
}

export interface LeaderboardStats {
  todayParticipants: number;
  totalAttempts: number;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'retrying' | 'failed';
