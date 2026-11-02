#include <cassert>
#include <cmath>
#include "../lifepulse_esp32/depth_calibration.h"
int main() {
  assert(std::isnan(calibratedDepthCm(1000, 1000, 1000)));
  assert(calibratedDepthCm(4095, 4095, 3058) == 0.0F);
  assert(std::fabs(calibratedDepthCm(3058, 4095, 3058) - 2.0F) < 0.001F);
  assert(calibratedDepthCm(3750, 4095, 3058) > 0.0F);
  assert(std::fabs(calibratedDepthCm(1500, 1000, 2000) - 1.0F) < 0.001F);
  assert(calibratedDepthCm(900, 1000, 2000) == 0.0F);
  assert(calibratedDepthCm(4095, 0, 100) == 7.5F);
}
