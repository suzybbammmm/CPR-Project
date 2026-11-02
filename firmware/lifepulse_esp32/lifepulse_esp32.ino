#include <WiFi.h>
#include <WebSocketsClient.h>
#include <Wire.h>
#include <Preferences.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include "secrets.h"
#include "depth_calibration.h"
#include "compression_tracker.h"

constexpr int POT_PIN = 34;
constexpr uint32_t SAMPLE_INTERVAL_MS = 10;
constexpr uint32_t OUTPUT_INTERVAL_MS = 100;
// Measured with the resistor/capacitor circuit. Recheck all seven points
// after changing wiring, mounting or the oscilloscope probe.
int calibration[7] = {1219, 1265, 1520, 1889, 2230, 2534, 2590};
int pendingCalibration[7] = {};
int nextCalibrationPoint = -1;
Preferences calibrationStorage;
bool calibrationStorageReady = false;
Adafruit_MPU6050 mpu;
WebSocketsClient webSocket;
CompressionTracker tracker;
bool mpuAvailable = false;
bool websocketStarted = false;
bool wifiAttemptStarted = false;
bool wifiWasConnected = false;
uint32_t lastSampleAt = 0, lastOutputAt = 0, lastWifiAttemptAt = 0;
uint32_t sequenceNumber = 0;
int potRaw = 0;
float depthCm = 0;

int calibrationRawAverage() {
  uint32_t total = 0;
  for (int i = 0; i < 32; ++i) { total += analogRead(POT_PIN); delay(2); }
  return total / 32;
}

void handleCalibration() {
  while (Serial.available()) {
    const char command = Serial.read();
    if (command == 'b') {
      nextCalibrationPoint = 0;
      tracker = CompressionTracker();
      Serial.println("Calibration: hold at 0cm, send 0, then 1..6 at each measured cm. x cancels. Accepted full table is saved.");
    } else if (command == 'x') {
      nextCalibrationPoint = -1;
      tracker = CompressionTracker();
      Serial.println("Calibration cancelled; previous table retained.");
    } else if (nextCalibrationPoint >= 0 && command == '0' + nextCalibrationPoint) {
      pendingCalibration[nextCalibrationPoint] = calibrationRawAverage();
      Serial.printf("CAL point=%d raw=%d\n", nextCalibrationPoint, pendingCalibration[nextCalibrationPoint]);
      if (++nextCalibrationPoint == 7) {
        if (validDepthTable(pendingCalibration)) {
          for (int i = 0; i < 7; ++i) calibration[i] = pendingCalibration[i];
          if (calibrationStorageReady &&
              calibrationStorage.putBytes("points", calibration, sizeof(calibration)) == sizeof(calibration))
            Serial.println("CALIBRATED: all seven points accepted and saved across reboot.");
          else Serial.println("CALIBRATED: table accepted in RAM; persistent save unavailable.");
        } else Serial.println("Calibration rejected: increasing points with >=8 ADC counts per cm required; previous table retained.");
        nextCalibrationPoint = -1;
        tracker = CompressionTracker();
      }
    }
  }
}

void webSocketEvent(WStype_t type, uint8_t*, size_t) {
  if (type == WStype_CONNECTED) {
    webSocket.sendTXT("{\"type\":\"sensor\",\"schema_version\":1,\"device_id\":\"manikin-01\"}");
    Serial.println("WebSocket connected");
  }
  if (type == WStype_DISCONNECTED) Serial.println("WebSocket disconnected");
}

void maintainWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiWasConnected) {
      Serial.printf("Wi-Fi connected. ESP32 IP=%s; server=%s:8765\n", WiFi.localIP().toString().c_str(), SERVER_IP);
      wifiWasConnected = true;
    }
    if (!websocketStarted) {
      webSocket.begin(SERVER_IP, 8765, "/");
      webSocket.onEvent(webSocketEvent);
      webSocket.setReconnectInterval(3000);
      websocketStarted = true;
    }
    return;
  }
  wifiWasConnected = false;
  const uint32_t now = millis();
  if (wifiAttemptStarted && now - lastWifiAttemptAt < 30000) return;
  if (wifiAttemptStarted) {
    Serial.printf("Wi-Fi attempt timed out; status=%d. Restarting connection.\n", static_cast<int>(WiFi.status()));
    // End the previous asynchronous attempt before changing station config.
    WiFi.disconnect(false, false);
  }
  lastWifiAttemptAt = now;
  wifiAttemptStarted = true;
  Serial.println("Connecting to Wi-Fi (allow up to 30 seconds)");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void jsonNumber(float value, char* buffer, size_t capacity) {
  if (isfinite(value)) snprintf(buffer, capacity, "%.2f", value);
  else snprintf(buffer, capacity, "null");
}

void sendReading(uint32_t now) {
  sensors_event_t acceleration{}, gyro{}, temperature{};
  if (mpuAvailable) mpu.getEvent(&acceleration, &gyro, &temperature);
  char recoil[24], residual[24], eventBpm[24];
  jsonNumber(tracker.recoilPercent, recoil, sizeof(recoil));
  jsonNumber(tracker.residualDepth, residual, sizeof(residual));
  jsonNumber(tracker.completedBpm, eventBpm, sizeof(eventBpm));
  char payload[700];
  snprintf(payload, sizeof(payload),
    "{\"type\":\"reading\",\"schema_version\":1,\"device_id\":\"manikin-01\",\"sequence\":%lu,\"depth\":%.2f,\"measured_depth_cm\":%.2f,\"pot_raw\":%d,\"compression_peak_cm\":%.2f,\"compression_count\":%lu,\"bpm\":%.2f,\"compression_bpm\":%s,\"recoil_percent\":%s,\"residual_depth_cm\":%s,\"accel_z\":%.2f,\"gyro_z\":%.3f,\"mpu_available\":%s,\"timestamp\":%lu}",
    static_cast<unsigned long>(sequenceNumber++), depthCm, depthCm, potRaw,
    tracker.completedPeak, static_cast<unsigned long>(tracker.count), tracker.liveBpm,
    eventBpm, recoil, residual, acceleration.acceleration.z, gyro.gyro.z,
    mpuAvailable ? "true" : "false", static_cast<unsigned long>(now));
  Serial.println(payload);
  if (WiFi.status() == WL_CONNECTED && websocketStarted) webSocket.sendTXT(payload);
}

void setup() {
  Serial.begin(115200);
  pinMode(POT_PIN, INPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(POT_PIN, ADC_11db);
  calibrationStorageReady = calibrationStorage.begin("lifepulse", false);
  if (calibrationStorageReady && calibrationStorage.getBytesLength("points") == sizeof(calibration)) {
    int saved[7];
    if (calibrationStorage.getBytes("points", saved, sizeof(saved)) == sizeof(saved) && validDepthTable(saved)) {
      for (int i = 0; i < 7; ++i) calibration[i] = saved[i];
      Serial.println("Saved seven-point calibration restored.");
    }
  }
  Serial.println("Seven-point depth / BPM / mechanical recoil ready. b starts recalibration; no boot auto-zero.");
  Wire.begin(21, 22);
  Wire.setTimeOut(20);
  mpuAvailable = mpu.begin();
  if (mpuAvailable) {
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  } else Serial.println("MPU6050 unavailable; potentiometer measurements continue.");
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(false); // maintainWiFi owns retries; avoid overlapping attempts.
}

void loop() {
  handleCalibration();
  maintainWiFi();
  if (websocketStarted) webSocket.loop();
  const uint32_t now = millis();
  if (now - lastSampleAt >= SAMPLE_INTERVAL_MS) {
    lastSampleAt = now;
    potRaw = analogRead(POT_PIN);
    depthCm = piecewiseDepthCm(potRaw, calibration);
    if (nextCalibrationPoint < 0) tracker.update(depthCm, now);
  }
  if (now - lastOutputAt >= OUTPUT_INTERVAL_MS) {
    lastOutputAt = now;
    if (nextCalibrationPoint < 0) sendReading(now);
    else Serial.printf("CALIBRATING point=%d pot_raw=%d\n", nextCalibrationPoint, potRaw);
  }
}
