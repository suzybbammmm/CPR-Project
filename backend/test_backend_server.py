import json
import sys
import types
import unittest


if "websockets" not in sys.modules:
    sys.modules["websockets"] = types.SimpleNamespace(
        exceptions=types.SimpleNamespace(ConnectionClosed=Exception),
        serve=None,
    )

import backend_server


class ServerConfigTests(unittest.TestCase):
    def test_defaults_to_real_sensor_mode(self):
        config = backend_server.load_config({})

        self.assertFalse(config.dev_mode)
        self.assertEqual(config.host, "0.0.0.0")
        self.assertEqual(config.port, 8765)

    def test_demo_backend_is_enabled_explicitly(self):
        config = backend_server.load_config({"LIFEPULSE_DEV_MODE": "true"})

        self.assertTrue(config.dev_mode)

    def test_rejects_an_invalid_port(self):
        with self.assertRaisesRegex(ValueError, "LIFEPULSE_PORT"):
            backend_server.load_config({"LIFEPULSE_PORT": "70000"})


class SensorPayloadTests(unittest.TestCase):
    def test_normalizes_valid_esp32_data(self):
        processed = backend_server.process_esp32_data(json.dumps({
            "depth": 5.47,
            "bpm": 111.2,
            "accel_z": 9.81,
            "gyro_z": -0.052,
            "timestamp": 1234,
        }))

        self.assertEqual(json.loads(processed), {
            "type": "reading",
            "schema_version": 1,
            "device_id": "manikin-01",
            "sequence": 0,
            "depth": 5.47,
            "compression_peak_cm": 5.47,
            "compression_count": 0,
            "accel_z": 9.81,
            "gyro_z": -0.052,
            "bpm": 111.2,
            "timestamp": 1234,
            "feedback": "완벽합니다!",
        })

    def test_rejects_physically_invalid_sensor_values(self):
        processed = backend_server.process_esp32_data(json.dumps({
            "depth": -2,
            "bpm": 900,
            "timestamp": 1234,
        }))

        self.assertIsNone(processed)

    def test_preserves_completed_compression_metadata(self):
        processed = backend_server.process_esp32_data(json.dumps({
            "type": "reading",
            "device_id": "manikin-01",
            "sequence": 8,
            "depth": 5.47,
            "compression_peak_cm": 5.6,
            "compression_count": 3,
            "bpm": 111.2,
            "accel_z": 9.81,
            "gyro_z": -0.052,
            "timestamp": 1234,
        }))

        payload = json.loads(processed)
        self.assertEqual(payload["type"], "reading")
        self.assertEqual(payload["device_id"], "manikin-01")
        self.assertEqual(payload["sequence"], 8)
        self.assertEqual(payload["compression_peak_cm"], 5.6)
        self.assertEqual(payload["compression_count"], 3)

    def test_preserves_optional_recoil_and_rejects_invalid_values(self):
        frame = {"depth": 1, "bpm": 110, "recoil_percent": 82.4}
        payload = json.loads(backend_server.process_esp32_data(json.dumps(frame)))
        self.assertEqual(payload["recoil_percent"], 82.4)
        frame["recoil_percent"] = None
        self.assertIsNone(json.loads(backend_server.process_esp32_data(json.dumps(frame)))["recoil_percent"])
        for value in [-1, 101, "82", True]:
            frame["recoil_percent"] = value
            self.assertIsNone(backend_server.process_esp32_data(json.dumps(frame)))

    def test_treats_an_untyped_first_payload_as_sensor_data(self):
        self.assertTrue(backend_server.is_sensor_payload({"depth": 5.0, "bpm": 105}))
        self.assertFalse(backend_server.is_sensor_payload({"type": "web"}))


class SensorFreshnessTests(unittest.TestCase):
    def test_cached_frame_is_not_live_without_a_recent_connected_sensor(self):
        saved = (backend_server.active_sensor_connections, backend_server.last_sensor_received_at)
        try:
            backend_server.active_sensor_connections = 1
            backend_server.last_sensor_received_at = 10.0
            self.assertTrue(backend_server.has_fresh_sensor_reading(10.9))
            self.assertFalse(backend_server.has_fresh_sensor_reading(11.0))
            backend_server.active_sensor_connections = 0
            self.assertFalse(backend_server.has_fresh_sensor_reading(10.1))
            backend_server.active_sensor_connections = 1
            backend_server.last_sensor_received_at = None
            self.assertFalse(backend_server.has_fresh_sensor_reading(10.1))
        finally:
            backend_server.active_sensor_connections, backend_server.last_sensor_received_at = saved


if __name__ == "__main__":
    unittest.main()
