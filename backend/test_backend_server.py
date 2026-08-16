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
            "depth": 5.47,
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


if __name__ == "__main__":
    unittest.main()
