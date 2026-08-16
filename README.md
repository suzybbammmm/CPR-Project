# 🚑 CPR 훈련 게임 시스템

심폐소생술(CPR) 훈련을 위한 실시간 피드백 게임 시스템입니다. ESP32 센서를 통해 압박 깊이와 속도를 측정하고, 게이미피케이션 요소로 재미있게 학습할 수 있습니다.

## 🖥️ 갤러리워크 듀얼 화면

장비가 없는 전시 환경에서도 시행자 화면과 강사 관제 화면을 서로 다른 기기에서 실행할 수 있습니다. 시연 모드는 백엔드, 센서, 인터넷 연결이 필요하지 않으며 72초 동안 `정상 → 깊이 부족 → 속도 과다 → 이완 부족 → 긴급 → 회복` 시나리오를 반복합니다.

```bash
cd frontend
npm install
npm run dev:host
```

한 대의 Mac에서 확인할 때:

- 시작 화면: `http://localhost:5173`
- 시행자 시연: `http://localhost:5173/participant?mode=demo`
- 강사 관제 시연: `http://localhost:5173/instructor?mode=demo`
- 기존 CPR 게임: `http://localhost:5173/game`

MacBook과 iPad에서 각각 실행할 때는 두 기기를 같은 Wi-Fi에 연결하고, 터미널에 표시된 `Network` 주소를 사용합니다.

- iPad: `http://<MAC_IP>:5173/participant?mode=demo`
- MacBook: `http://localhost:5173/instructor?mode=demo`

시연 화면에는 실제 측정으로 오인되지 않도록 `시연 모드 · 가상 센서 데이터`가 항상 표시됩니다. 운영 중에는 Mac의 자동 잠자기와 두 기기의 자동 잠금을 해제하고, 행사 전에 `npm install`을 완료해야 오프라인에서도 실행할 수 있습니다.

### 실제 센서 화면

```bash
# 터미널 1: 실제 센서 WebSocket 서버
cd backend
source venv/bin/activate
LIFEPULSE_DEV_MODE=false python backend_server.py

# 터미널 2: 프런트엔드
cd frontend
npm run dev:host
```

- 실제 시행자 화면: `http://localhost:5173/participant?mode=live`
- 실제 강사 화면: `http://localhost:5173/instructor?mode=live`

현재 ESP32 메시지는 단일 센서 스트림이므로 실제 강사 화면에서는 스테이션 A 한 명을 표시합니다. 8명 동시 화면은 장비 없는 시연 모드에서 확인할 수 있습니다.

## ✨ 주요 기능

- 📊 **실시간 압박 분석**: 깊이(5-6cm)와 속도(100-120 BPM) 실시간 측정
- 🎮 **게이미피케이션**: 점수, 콤보, 등급 시스템으로 재미있는 학습
- 📈 **상세 결과 분석**: 압박 깊이/속도 그래프, 적정 압박률, 평균 통계
- 👥 **멀티플레이어**: 여러 명이 돌아가며 연습 가능
- 🧪 **개발 모드**: 마네킹 없이 가짜 데이터로 테스트 가능

## 🛠 기술 스택

### Frontend
- **React** + **TypeScript** + **Vite**
- **Tailwind CSS**: 스타일링
- **Framer Motion**: 애니메이션
- **Recharts**: 데이터 시각화

### Backend
- **Python** (WebSocket 서버)
- **asyncio** + **websockets**

### Hardware
- **ESP32**: 센서 데이터 수집 (마네킹 압박 감지)

---

## 📦 설치 및 실행 가이드

### 🚀 빠른 시작 (마네킹 없이 개발)

**대부분의 팀원은 이 방법으로 시작하세요!**

#### 1️⃣ 백엔드 설정 (Python)

```bash
# 백엔드 폴더로 이동
cd backend

# 가상환경 생성
python3 -m venv venv

# 가상환경 활성화
source venv/bin/activate  # macOS/Linux
# 또는
venv\Scripts\activate     # Windows

# 패키지 설치
pip install -r requirements.txt

# 가짜 센서 백엔드 실행 (필요할 때만)
LIFEPULSE_DEV_MODE=true python backend_server.py
```

**터미널 출력 확인:**
```
============================================================
🔧 개발 모드: 가짜 센서 데이터 사용
   React 개발자는 마네킹 없이 테스트 가능!
============================================================
서버 시작! 포트 8765에서 대기 중...
```

#### 2️⃣ 프론트엔드 설정 (React)

**새 터미널을 열고:**

```bash
# 프론트엔드 폴더로 이동
cd frontend

# 패키지 설치 (최초 1회만)
npm install

# 환경 변수 설정 (최초 1회만)
cp .env.example .env

# 개발 서버 실행
npm run dev
```

#### 3️⃣ 브라우저에서 확인

- 브라우저에서 `http://localhost:5173` 접속
- 가짜 데이터가 실시간으로 들어오는 것 확인
- 게임을 플레이하면서 UI 개발/테스트 가능!

---

## 🎯 환경 설정 (중요!)

### 📋 시나리오별 설정

프런트엔드는 URL의 `mode`로, 백엔드는 환경변수로 데이터 모드를 분리합니다.

### 👥 **팀원용 (마네킹 없이 개발)**

#### 프론트엔드: `frontend/.env`
```bash
# 실제 센서 URL을 사용할 때만 필요
VITE_WEBSOCKET_URL=ws://localhost:8765
```

**이 설정으로:**
- 백엔드 없이도 프론트엔드만 실행 가능
- URL에서 `?mode=demo` 사용
- UI 개발에 집중 가능
- 마네킹, ESP32 불필요

---

### 🔧 **마네킹 보유자용 (실제 센서 데이터)**

#### 백엔드 환경변수
```bash
LIFEPULSE_DEV_MODE=false python backend_server.py
```

#### 프론트엔드: `frontend/.env`
```bash
VITE_WEBSOCKET_URL=ws://localhost:8765
```

**이 설정으로:**
- 백엔드와 프론트엔드 모두 실행 필요
- ESP32에서 실제 센서 데이터 수신
- 마네킹 압박 시 실시간 피드백

**실행 순서:**
1. ESP32 마네킹에 전원 연결
2. 백엔드 서버 실행 (`python backend_server.py`)
3. 프론트엔드 실행 (`npm run dev:host`)
4. `/participant?mode=live` 또는 `/instructor?mode=live` 접속
5. 마네킹 압박 시작

---

## 📂 프로젝트 구조

```
cpr-project/
├── .gitignore              # Git 제외 파일 설정
├── README.md               # 이 파일
│
├── backend/                # Python 백엔드
│   ├── venv/              # 가상환경 (Git 제외)
│   ├── backend_server.py  # WebSocket 서버
│   └── requirements.txt   # Python 패키지 목록
│
└── frontend/               # React 프론트엔드
    ├── node_modules/      # npm 패키지 (Git 제외)
    ├── src/
    │   ├── components/    # UI 컴포넌트
    │   ├── pages/         # 화면 (MainScreen, GamePlayScreen, ResultScreen)
    │   ├── hooks/         # Custom Hooks (useWebSocket, useGameData)
    │   ├── context/       # Context API (GameContext)
    │   └── utils/         # 유틸리티 (scoring, grading)
    ├── .env               # 환경 변수 (Git 제외)
    ├── .env.example       # 환경 변수 템플릿
    └── package.json       # npm 패키지 목록
```

---

## 🎮 사용 방법

### 게임 플레이

1. **플레이어 수 선택** (1-4명)
2. **게임 시작** 버튼 클릭
3. **2분 동안 CPR 압박** 수행
4. **실시간 피드백** 확인
   - 깊이: 5-6cm 유지
   - 속도: 100-120 BPM 유지
5. **결과 화면**에서 점수, 등급, 그래프 확인

### 멀티플레이어

- 여러 명이 순서대로 플레이
- 게임 종료 후 순위 비교
- 최고 점수자 확인

---

## 🔍 데이터 구조

### WebSocket 메시지 (ESP32 → 서버 → React)

```json
{
  "depth": 5.7,              // 압박 깊이 (cm)
  "bpm": 110.0,              // 분당 압박 속도 (BPM)
  "accel_z": 9.8,            // 가속도 센서 z축
  "gyro_z": -0.05,           // 자이로 센서 z축
  "timestamp": 96004,        // 타임스탬프 (ms)
  "feedback": "완벽합니다!"   // 피드백 메시지
}
```

### 피드백 메시지 규칙

| 조건 | 피드백 |
|------|--------|
| depth == 0 또는 bpm == 0 | "압박을 시작하세요" |
| depth < 5.0 | "더 깊이 눌러주세요" |
| depth > 6.0 | "너무 깊어요" |
| bpm < 100 | "속도를 높여주세요" |
| bpm > 120 | "속도를 줄여주세요" |
| 5.0 ≤ depth ≤ 6.0 & 100 ≤ bpm ≤ 120 | "완벽합니다!" |

---

## 🐛 문제 해결

### ❌ WebSocket 연결 실패

**증상:** 브라우저에서 "WebSocket disconnected" 표시

**해결 방법:**
1. 백엔드 서버가 실행 중인지 확인
   ```bash
   # 포트 사용 확인
   lsof -i :8765
   ```
2. 프론트엔드 `.env` 파일의 `VITE_WEBSOCKET_URL` 확인
3. 방화벽에서 포트 8765 허용 확인

---

### ❌ "React 클라이언트 연결" 메시지가 안 뜸

**증상:** 백엔드 터미널에 연결 메시지가 없음

**원인:** 시연 모드 URL에 접속했거나 실제 센서 서버가 실행되지 않음

**해결 방법:**
1. URL이 `/participant?mode=live`인지 확인
2. `frontend/.env`의 `VITE_WEBSOCKET_URL` 확인
3. 프론트엔드 재시작

---

### ❌ Python 패키지 설치 에러 (externally-managed-environment)

**증상:**
```
error: externally-managed-environment
```

**원인:** 가상환경 없이 시스템 Python에 설치하려고 함

**해결 방법:**
```bash
# 가상환경 생성
python3 -m venv venv

# 가상환경 활성화
source venv/bin/activate  # macOS/Linux

# 패키지 설치
pip install -r requirements.txt
```

---

### ❌ 프론트엔드에서 가짜 데이터만 나옴

**원인:** URL에 `mode=demo`가 지정됨

**해결 방법:**
1. 실제 센서 서버 실행
2. `/participant?mode=live` 또는 `/instructor?mode=live`로 접속

---

## 📊 평가 기준

| 항목 | 기준 |
|------|------|
| **적정 깊이** | 5-6cm |
| **적정 속도** | 100-120 BPM |
| **점수 계산** | 기본 10점 + 콤보 보너스 (콤보 x 2점) |
| **등급** | S (10000+), A (7000+), B (5000+), C (3000+), D (3000 미만) |

---

## 👥 팀원을 위한 체크리스트

### ✅ 처음 시작할 때

- [ ] 프로젝트 클론: `git clone <repo-url>`
- [ ] 백엔드 가상환경 생성: `cd backend && python3 -m venv venv`
- [ ] 백엔드 패키지 설치: `pip install -r requirements.txt`
- [ ] 프론트엔드 패키지 설치: `cd frontend && npm install`
- [ ] 환경 변수 설정: `cp .env.example .env`

### ✅ 개발할 때

- [ ] **마네킹 없음:** URL에서 `mode=demo` 사용
- [ ] **마네킹 있음:** URL에서 `mode=live` 사용
- [ ] 백엔드 실행: `python backend_server.py` (venv 활성화 필수)
- [ ] 프론트엔드 실행: `npm run dev`

### ✅ Git 커밋하기 전

- [ ] `.env` 파일이 Git에 올라가지 않는지 확인 (.gitignore 확인)
- [ ] `venv/`, `node_modules/` 폴더가 Git에 올라가지 않는지 확인
- [ ] 실제 센서 모드는 `LIFEPULSE_DEV_MODE=false`, 가짜 백엔드는 `true`로 실행하기

---

## 📝 라이선스

이 프로젝트는 교육용 졸업 프로젝트입니다.
