import { describe, expect, it } from 'vitest';
import { getNewCompressionEvents } from './compressionEvents';

describe('completed compression events', () => {
  it('emits each ESP32 compression count exactly once', () => {
    expect(getNewCompressionEvents(4, 4, 5.5, 108)).toEqual([]);
    expect(getNewCompressionEvents(4, 6, 5.5, 108)).toEqual([
      { count: 5, peakCm: 5.5, bpm: 108 },
      { count: 6, peakCm: 5.5, bpm: 108 }
    ]);
  });

  it('does not create an event when the device counter resets', () => {
    expect(getNewCompressionEvents(8, 1, 5.5, 108)).toEqual([]);
  });
});
