#pragma once
#include <cmath>

// Two measured positions; supports either potentiometer wiring direction.
inline float calibratedDepthCm(int raw, int restRaw, int twoCmRaw) {
  if (restRaw == twoCmRaw) return NAN;
  const float depth = 2.0F * static_cast<float>(raw - restRaw) /
                      static_cast<float>(twoCmRaw - restRaw);
  return depth < 0.0F ? 0.0F : (depth > 7.5F ? 7.5F : depth);
}

inline bool validDepthTable(const int* points) {
  for (int i = 1; i < 7; ++i) {
    if (points[i] < 0 || points[i] > 4095) return false;
    if (points[i] - points[i - 1] < 8) return false;
  }
  return points[0] >= 0 && points[0] <= 4095;
}

inline float piecewiseDepthCm(float raw, const int* points) {
  if (!validDepthTable(points)) return NAN;
  if (raw <= points[0]) return 0;
  if (raw >= points[6]) return 6;
  for (int i = 0; i < 6; ++i)
    if (raw <= points[i + 1])
      return i + (raw - points[i]) / (points[i + 1] - points[i]);
  return 6;
}
