#pragma once
#include <cstdint>
#include <cmath>

// Mechanical displacement only: this cannot measure hand force or contact.
struct CompressionTracker {
  enum Phase { Ready, Pressing, Returning };
  Phase phase = Ready;
  float peak = 0, minimum = 0, liveBpm = 0;
  float completedPeak = 0, recoilPercent = NAN, residualDepth = NAN;
  float completedBpm = NAN, cycleBpm = NAN;
  uint32_t count = 0, lastStart = 0, releaseAt = 0;
  bool haveStart = false, releaseTiming = false;
  bool armed = false, reboundTiming = false;
  uint32_t reboundAt = 0;
  static constexpr float TurnCm = 0.25F;
  static constexpr uint32_t TimeoutMs = 2500;
  static constexpr uint32_t MinimumStartIntervalMs = 240;

  bool canStart(uint32_t now) const {
    return !haveStart || now - lastStart >= MinimumStartIntervalMs;
  }

  void start(float depth, uint32_t now) {
    cycleBpm = NAN;
    if (haveStart && now - lastStart <= TimeoutMs && now != lastStart)
      cycleBpm = 60000.0F / static_cast<float>(now - lastStart);
    liveBpm = std::isfinite(cycleBpm) ? cycleBpm : 0;
    lastStart = now;
    haveStart = true;
    peak = depth;
    phase = Pressing;
    releaseTiming = false;
    reboundTiming = false;
  }
  void finish() {
    completedPeak = peak;
    residualDepth = minimum;
    recoilPercent = 100.0F * (peak - minimum) / peak;
    if (recoilPercent < 0) recoilPercent = 0;
    if (recoilPercent > 100) recoilPercent = 100;
    completedBpm = cycleBpm;
    ++count;
    phase = Ready;
    releaseTiming = false;
  }
  void update(float depth, uint32_t now) {
    if (haveStart && now - lastStart > TimeoutMs) {
      liveBpm = 0;
      haveStart = false;
    }
    if (phase == Ready) {
      if (depth <= 0.5F) armed = true;
      if (depth < minimum) minimum = depth;
      if (armed && depth >= 1.5F && depth - minimum >= TurnCm && canStart(now)) start(depth, now);
      return;
    }
    if (phase == Pressing) {
      if (depth > peak) peak = depth;
      if (peak - depth < TurnCm) return;
      phase = Returning;
      minimum = depth;
    }
    if (depth < minimum) minimum = depth;
    if (depth - minimum >= TurnCm && depth >= 1.5F && canStart(now)) {
      if (!reboundTiming) { reboundAt = now; reboundTiming = true; }
      if (now - reboundAt >= 30) {
        finish();
        start(depth, now);
      }
      return;
    } else reboundTiming = false;
    if (depth <= 0.5F) {
      if (!releaseTiming) { releaseAt = now; releaseTiming = true; }
      if (now - releaseAt >= 100) finish();
    } else releaseTiming = false;
  }
};
