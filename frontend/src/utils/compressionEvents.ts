export interface CompressionEvent {
  count: number;
  peakCm: number;
  bpm: number;
}

export function getNewCompressionEvents(
  previousCount: number | null,
  currentCount: number,
  peakCm: number,
  bpm: number
): CompressionEvent[] {
  if (previousCount === null || currentCount <= previousCount) return [];
  return Array.from({ length: currentCount - previousCount }, (_, index) => ({
    count: previousCount + index + 1,
    peakCm,
    bpm
  }));
}
