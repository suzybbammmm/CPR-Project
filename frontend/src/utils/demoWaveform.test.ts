import { describe, expect, it } from 'vitest';
import { getDemoWaveformReading } from './demoWaveform';

describe('gallery demo compression waveform', () => {
  it('returns to near zero between compressions so the game can count each release', () => {
    expect(getDemoWaveformReading('adult', 0).depth).toBeLessThan(1);
    expect(getDemoWaveformReading('adult', 280).depth).toBeGreaterThan(4.8);
  });

  it('changes the simulated peak depth for the selected victim', () => {
    expect(getDemoWaveformReading('adult', 280).depth).toBeGreaterThan(
      getDemoWaveformReading('infant', 280).depth
    );
  });

  it('includes an intentional correction phase for the exhibition feedback loop', () => {
    const normal = getDemoWaveformReading('child', 280);
    const shallow = getDemoWaveformReading('child', 20_280);
    expect(normal.bpm).toBe(108);
    expect(shallow.depth).toBeLessThan(normal.depth);
  });
});
