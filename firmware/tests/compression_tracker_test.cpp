#include <cassert>
#include <cmath>
#include "../lifepulse_esp32/compression_tracker.h"
#include "../lifepulse_esp32/depth_calibration.h"
int main() {
  int table[] = {1219,1265,1520,1889,2230,2534,2590};
  assert(piecewiseDepthCm(1219, table) == 0);
  assert(piecewiseDepthCm(2590, table) == 6);
  assert(std::fabs(piecewiseDepthCm(1392.5, table)-1.5F)<0.001F);
  assert(std::isnan(CompressionTracker().recoilPercent));
  CompressionTracker t;
  t.update(0,0); t.update(1.5,100); t.update(5,200);
  t.update(4.9,210); assert(t.count == 0); // peak noise
  t.update(3,250); t.update(1,300); t.update(1.6,340); t.update(1.6,370);
  assert(t.count == 1 && t.completedPeak == 5);
  assert(std::fabs(t.recoilPercent-80)<0.01F);
  t.update(1.6,400); t.update(5,500); t.update(0,600); t.update(0,700);
  assert(t.count == 2 && t.recoilPercent == 100);
  assert(std::fabs(t.completedBpm-(60000.0F/270))<0.01F);
  t.update(0,800); assert(t.count==2);
  t.update(0,4000); assert(t.liveBpm==0);
  t.update(2,4100); assert(t.liveBpm==0); // timeout excludes old start
  t.update(5,4200); t.update(2,4300); t.update(2.3,4370); t.update(2.3,4400);
  assert(t.count==3 && std::fabs(t.recoilPercent-60)<0.01F);
  assert(std::isnan(t.completedBpm));
  CompressionTracker repeated;
  for (uint32_t cycle = 0; cycle < 5; ++cycle) {
    const uint32_t base = cycle * 600;
    repeated.update(0, base);
    repeated.update(1.5F, base + 100);
    repeated.update(5, base + 200);
    repeated.update(2, base + 300);
    repeated.update(0, base + 400);
    repeated.update(0, base + 500);
  }
  assert(repeated.count == 5);
  assert(repeated.completedBpm == 100);
  assert(repeated.recoilPercent == 100);
  CompressionTracker partial;
  partial.update(0,0); partial.update(1.5F,100); partial.update(5,200);
  partial.update(2,300); partial.update(2.1F,310);
  assert(partial.count == 0); // small return noise cannot finalize
  partial.update(2.3F,370); partial.update(2.3F,400);
  assert(partial.count == 1 && partial.residualDepth == 2);
  partial.update(5,500); partial.update(2,600); partial.update(2.3F,670); partial.update(2.3F,700);
  assert(partial.count == 2 && partial.completedBpm == 200);
  assert(partial.recoilPercent == 60);
  CompressionTracker phantom;
  phantom.update(0,0); phantom.update(1.5F,100); phantom.update(5,200);
  phantom.update(4.7F,210); phantom.update(5,220);
  assert(phantom.count == 0 && phantom.liveBpm == 0);
  phantom.update(4.7F,400); phantom.update(5,410); phantom.update(4.7F,420);
  assert(phantom.count == 0); // isolated rebound shorter than 30ms
  CompressionTracker noise;
  noise.update(0,0); noise.update(1.5F, 100); noise.update(5, 105);
  noise.update(2, 110); noise.update(2.3F, 120);
  assert(noise.count == 0 && noise.lastStart == 100);
  noise.update(2.3F, 340); noise.update(2.3F, 370);
  assert(noise.count == 1 && noise.liveBpm <= 250);
  // Initial held-down boot is not silently treated as a zero calibration.
  CompressionTracker held; held.update(5,0); assert(held.count==0 && held.phase==CompressionTracker::Ready);
  held.update(4,100); held.update(5,500); assert(held.count==0);
  held.update(0,600); held.update(2,700); assert(held.phase==CompressionTracker::Pressing);
}
