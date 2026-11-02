import asyncio
import json
import math
import os
import random
from dataclasses import dataclass
from typing import Any, Mapping

import websockets


@dataclass(frozen=True)
class ServerConfig:
     dev_mode: bool
     host: str
     port: int


def _parse_bool(value: str, variable_name: str) -> bool:
     normalized = value.strip().lower()
     if normalized in {"1", "true", "yes", "on"}:
          return True
     if normalized in {"0", "false", "no", "off"}:
          return False
     raise ValueError(f"{variable_name} must be true or false")


def load_config(environment: Mapping[str, str]) -> ServerConfig:
     """환경변수에서 서버 설정을 읽고 잘못된 값을 즉시 거부합니다."""
     dev_mode = _parse_bool(
          environment.get("LIFEPULSE_DEV_MODE", "false"),
          "LIFEPULSE_DEV_MODE"
     )
     host = environment.get("LIFEPULSE_HOST", "0.0.0.0").strip()
     if not host:
          raise ValueError("LIFEPULSE_HOST must not be empty")

     try:
          port = int(environment.get("LIFEPULSE_PORT", "8765"))
     except ValueError as error:
          raise ValueError("LIFEPULSE_PORT must be an integer") from error
     if not 1 <= port <= 65535:
          raise ValueError("LIFEPULSE_PORT must be between 1 and 65535")

     return ServerConfig(dev_mode=dev_mode, host=host, port=port)

 # 연결된 웹 클라이언트 저장
connected_clients = set()
last_sensor_reading: dict[str, Any] | None = None
last_sensor_received_at: float | None = None
active_sensor_connections = 0

CONFIG = load_config(os.environ)
DEV_MODE = CONFIG.dev_mode


def _bounded_float(data, key, minimum, maximum, default=0.0):
     value = float(data.get(key, default))
     if not math.isfinite(value) or not minimum <= value <= maximum:
          raise ValueError(f"{key} must be between {minimum} and {maximum}")
     return value


def _non_negative_int(data: Mapping[str, Any], key: str, default: int = 0) -> int:
     value = int(data.get(key, default))
     if value < 0:
          raise ValueError(f"{key} must not be negative")
     return value


def is_sensor_payload(data: Mapping[str, Any]) -> bool:
     """True for both the versioned ESP32 protocol and the legacy sensor frame."""
     return data.get("type") in {"sensor", "reading"} or "depth" in data or "bpm" in data

def generate_feedback(depth, bpm):
     """깊이와 BPM 기반으로 피드백 생성"""
     if depth == 0 or bpm == 0:
         return "압박을 시작하세요"
     elif depth < 5.0:
         return "더 깊이 눌러주세요"
     elif depth > 6.0:
         return "너무 깊어요"
     elif bpm < 100:
         return "속도를 높여주세요"
     elif bpm > 120:
         return "속도를 줄여주세요"
     else:
         return "완벽합니다!"

def process_esp32_data(raw_data):
     """ESP32 데이터 처리 및 검증"""
     try:
         # JSON 파싱
         data = json.loads(raw_data)

         # 필수 필드 확인 및 기본값 설정
         depth = _bounded_float(data, "depth", 0.0, 15.0)
         accel_z = _bounded_float(data, "accel_z", -100.0, 100.0)
         gyro_z = _bounded_float(data, "gyro_z", -1000.0, 1000.0)
         bpm = _bounded_float(data, "bpm", 0.0, 250.0)
         timestamp = _non_negative_int(data, "timestamp")
         sequence = _non_negative_int(data, "sequence")
         compression_count = _non_negative_int(data, "compression_count")
         compression_peak_cm = _bounded_float(
             data, "compression_peak_cm", 0.0, 15.0, default=depth
         )
         device_id = str(data.get("device_id", "manikin-01")).strip()
         if not device_id:
              raise ValueError("device_id must not be empty")

         # 피드백 자동 생성 (ESP32에 없으면)
         feedback = data.get("feedback", generate_feedback(depth, bpm))

         # 검증된 데이터 재구성
         processed_data = {
             "type": "reading",
             "schema_version": 1,
             "device_id": device_id,
             "sequence": sequence,
             "depth": round(depth, 2),
             "compression_peak_cm": round(compression_peak_cm, 2),
             "compression_count": compression_count,
             "accel_z": round(accel_z, 2),
             "gyro_z": round(gyro_z, 3),
             "bpm": round(bpm, 1),
             "timestamp": timestamp,
             "feedback": feedback
         }

         for key, maximum in (("recoil_percent", 100.0), ("compression_bpm", 250.0), ("residual_depth_cm", 15.0)):
             if key in data:
                 value = data[key]
                 if value is None:
                     processed_data[key] = None
                 elif isinstance(value, bool) or not isinstance(value, (int, float)):
                     raise ValueError(f"{key} must be a number or null")
                 else:
                     processed_data[key] = round(_bounded_float(data, key, 0.0, maximum), 2)

         return json.dumps(processed_data)

     except json.JSONDecodeError as e:
         print(f"❌ JSON 파싱 오류: {e}")
         print(f"   받은 데이터: {raw_data}")
         return None
     except (ValueError, TypeError) as e:
         print(f"❌ 데이터 형식 오류: {e}")
         print(f"   받은 데이터: {raw_data}")
         return None
     except Exception as e:
         print(f"❌ 알 수 없는 오류: {e}")
         print(f"   받은 데이터: {raw_data}")
         return None

async def generate_fake_data():
     """개발용 가짜 센서 데이터 생성 (패턴 시뮬레이션)"""
     pattern = 0

     while True:
         if connected_clients and DEV_MODE:
             # 패턴 1: 정상 압박 (5초)
             if pattern < 100:
                 depth = round(random.uniform(5.0, 6.0), 2)
                 bpm = round(random.uniform(100, 120), 1)
                 feedback = "완벽합니다!"

             # 패턴 2: 너무 약한 압박 (3초)
             elif pattern < 160:
                 depth = round(random.uniform(3.0, 4.5), 2)
                 bpm = round(random.uniform(90, 100), 1)
                 feedback = "더 깊이 눌러주세요"

             # 패턴 3: 너무 강한 압박 (3초)
             elif pattern < 220:
                 depth = round(random.uniform(6.5, 7.5), 2)
                 bpm = round(random.uniform(120, 140), 1)
                 feedback = "너무 깊어요"

             # 패턴 4: 쉬는 시간 (2초)
             else:
                 depth = 0.0
                 bpm = 0.0
                 feedback = "압박을 시작하세요"
                 if pattern > 260:
                     pattern = 0  # 반복

             fake_data = {
                 "depth": depth,
                 "accel_z": round(random.uniform(8.0, 12.0), 2),
                 "gyro_z": round(random.uniform(-0.1, 0.1), 3),
                 "bpm": bpm,
                 "timestamp": int(asyncio.get_event_loop().time() * 1000),
                 "feedback": feedback
             }

             message = json.dumps(fake_data)

             # 모든 웹 클라이언트에게 전송
             await asyncio.gather(
                 *[client.send(message) for client in connected_clients],
                 return_exceptions=True
             )

             pattern += 1

         await asyncio.sleep(0.05)  # 20Hz

async def broadcast(message: str):
     """Send to web clients and prune connections that have died."""
     if not connected_clients:
          return
     clients = tuple(connected_clients)
     results = await asyncio.gather(
          *[client.send(message) for client in clients],
          return_exceptions=True
     )
     for client, result in zip(clients, results):
          if isinstance(result, Exception):
               connected_clients.discard(client)


def has_fresh_sensor_reading(now: float) -> bool:
     return (active_sensor_connections > 0 and last_sensor_received_at is not None
             and 0 <= now - last_sensor_received_at < 1.0)


async def broadcast_status():
     sensor_online = has_fresh_sensor_reading(asyncio.get_running_loop().time())
     await broadcast(json.dumps({
          "type": "status",
          "sensor_online": sensor_online,
          "last_sensor_received_at": int((last_sensor_received_at or 0) * 1000),
     }))


async def process_sensor_message(message: str):
     global last_sensor_reading, last_sensor_received_at
     processed_message = process_esp32_data(message)
     if not processed_message:
          print("⚠️  데이터 처리 실패 - 전송 건너뜀")
          return
     last_sensor_reading = json.loads(processed_message)
     last_sensor_received_at = asyncio.get_running_loop().time()
     last_sensor_reading["server_received_at"] = int(last_sensor_received_at * 1000)
     await broadcast(json.dumps(last_sensor_reading))


async def handler(websocket):
     """클라이언트 연결 핸들러"""
     client_type = None

     global active_sensor_connections
     try:
         async for message in websocket:
             data = json.loads(message)
             if client_type is None and data.get("type") == "web":
                 client_type = "web"
                 connected_clients.add(websocket)
                 print(f"✅ React 클라이언트 연결! (총 {len(connected_clients)}개)")
                 await broadcast_status()
                 if last_sensor_reading and has_fresh_sensor_reading(asyncio.get_running_loop().time()):
                     await websocket.send(json.dumps(last_sensor_reading))
                 continue

             if client_type is None and is_sensor_payload(data):
                 client_type = "esp32"
                 active_sensor_connections += 1
                 print("📡 ESP32 연결됨!")
                 await broadcast_status()

             if client_type == "esp32" and data.get("type") != "sensor" and not DEV_MODE:
                 # This handles the very first untyped legacy frame too.
                 await process_sensor_message(message)

     except websockets.exceptions.ConnectionClosed:
         pass  # 정상 종료
     except json.JSONDecodeError as e:
         print(f"❌ 첫 메시지 JSON 오류: {e}")
     except Exception as e:
         print(f"❌ 핸들러 에러: {e}")
         import traceback
         traceback.print_exc()

     finally:
         # 연결 종료 시 클라이언트 제거
         if client_type == "web" and websocket in connected_clients:
             connected_clients.remove(websocket)
             print(f"React 연결 종료 (남은 개수: {len(connected_clients)})")
         elif client_type == "esp32":
             active_sensor_connections = max(0, active_sensor_connections - 1)
             await broadcast_status()
             print("ESP32 연결 종료")

async def main():
     """서버 메인 함수"""
     print("=" * 60)
     if DEV_MODE:
         print("🔧 개발 모드: 가짜 센서 데이터 사용")
         print("   React 개발자는 마네킹 없이 테스트 가능!")
         print("   (실제 센서 사용: LIFEPULSE_DEV_MODE=false)")
     else:
         print("📡 실전 모드: ESP32 실제 센서 대기 중")
         print("   보조배터리 연결 후 마네킹 압박 필요!")
     print("=" * 60)
     print(f"서버 시작! {CONFIG.host}:{CONFIG.port}에서 대기 중...\n")

     # REST API 서버 시작 (포트 8766)
     try:
         from api_server import start_api_server, set_sensor_state
         set_sensor_state({
             "connected": active_sensor_connections > 0,
             "last_received_at": last_sensor_received_at,
         })
         asyncio.create_task(start_api_server())
         print(f"REST API 서버 시작 중 (포트 {os.environ.get('LIFEPULSE_API_PORT', '8766')})")
     except ImportError as e:
         print(f"⚠️  REST API 서버를 시작하지 못했습니다 (aiohttp 미설치?): {e}")

     # WebSocket 서버 시작
     async with websockets.serve(handler, CONFIG.host, CONFIG.port):
         # 개발 모드일 때만 가짜 데이터 생성 태스크 실행
         if DEV_MODE:
             asyncio.create_task(generate_fake_data())

         # 서버 무한 실행
         await asyncio.Future()

 # 서버 실행
if __name__ == "__main__":
     asyncio.run(main())
