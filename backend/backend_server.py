import asyncio
import json
import math
import os
import random
from dataclasses import dataclass
from typing import Mapping

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

CONFIG = load_config(os.environ)
DEV_MODE = CONFIG.dev_mode


def _bounded_float(data, key, minimum, maximum, default=0.0):
     value = float(data.get(key, default))
     if not math.isfinite(value) or not minimum <= value <= maximum:
          raise ValueError(f"{key} must be between {minimum} and {maximum}")
     return value

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
         timestamp = int(data.get("timestamp", 0))
         if timestamp < 0:
              raise ValueError("timestamp must not be negative")

         # 피드백 자동 생성 (ESP32에 없으면)
         feedback = data.get("feedback", generate_feedback(depth, bpm))

         # 검증된 데이터 재구성
         processed_data = {
             "depth": round(depth, 2),
             "accel_z": round(accel_z, 2),
             "gyro_z": round(gyro_z, 3),
             "bpm": round(bpm, 1),
             "timestamp": timestamp,
             "feedback": feedback
         }

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

async def handler(websocket):
     """클라이언트 연결 핸들러"""
     client_type = None

     try:
         # 첫 메시지로 클라이언트 타입 확인
         first_message = await websocket.recv()
         data = json.loads(first_message)

         if "type" in data and data["type"] == "web":
             # ===== React 웹 클라이언트 =====
             client_type = "web"
             connected_clients.add(websocket)
             print(f"✅ React 클라이언트 연결! (총 {len(connected_clients)}개)")

             if DEV_MODE:
                 print("   🔧 개발 모드: 가짜 데이터 수신 중...")
             else:
                 print("   📡 실전 모드: ESP32 데이터 대기 중...")

             # 연결 유지 (React는 데이터 수신만)
             async for message in websocket:
                 pass  # React에서 보내는 메시지는 무시

         else:
             # ===== ESP32 센서 클라이언트 =====
             if DEV_MODE:
                 print("⚠️  개발 모드 활성화 중 - ESP32 데이터 무시됨")
                 print("   (실제 센서 사용: LIFEPULSE_DEV_MODE=false)")
                 async for message in websocket:
                     pass  # 개발 모드에서는 ESP32 데이터 무시
             else:
                 client_type = "esp32"
                 print("📡 ESP32 연결됨!")

                 # ESP32 데이터를 모든 웹 클라이언트에게 전달
                 async for message in websocket:
                     print(f"📥 ESP32 원본: {message}")

                     # 데이터 처리 및 검증
                     processed_message = process_esp32_data(message)

                     if processed_message and connected_clients:
                         print(f"📤 처리 후 전송: {processed_message}")

                         # 모든 웹 클라이언트에게 전송
                         await asyncio.gather(
                             *[client.send(processed_message) for client in
  connected_clients],
                             return_exceptions=True
                         )
                     elif not processed_message:
                         print("⚠️  데이터 처리 실패 - 전송 건너뜀")

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
