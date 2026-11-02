# LifePulse CPR Project Status

## 2026-10-28 추가 — 1~4인 순환 실습과 게임 점수

- `/participant?mode=live`가 팀 실습 화면이다. 1~4명·대상 선택 → 한 사람당120초 → 교대 준비 버튼 → 마지막 개인별 결과/순위로 진행한다. 브라우저 새로고침 시 진행 세션은 초기화되며 영구 저장하지 않는다.
- 새 코드: `frontend/src/live/teamSession.ts`, `hooks/useTeamSession.ts`, `pages/TeamPracticeScreen.tsx`, `team-practice.css`. 기존 ParticipantSessionScreen은 레거시/테스트 호환을 위해 보존한다.
- 각 라운드는 센서 누적 횟수의 시작 기준을 분리하며 원위치 확인 후 수집한다. 교대 중 데이터·늦은 패킷·중복을 제외하고 장치 재시작을 기준 재설정한다. 누락된 횟수는 표시하되 마지막 최고 깊이를 복제해 가짜 압박 기록을 만들지 않는다. 첫 완료 압박의 이전 사람과 연결될 수 있는 속도는 채점에서 제외한다.
- 정확(대상 깊이 범위+100~120BPM)+2XP, 근접(깊이 범위±1cm+85~135BPM)+1XP, 나머지0XP. 100점=획득XP/(속도가 확인된 완료 압박수×2)×100. 올바른 압박 연속 시 콤보, 근접/미흡/속도미확인 시 초기화. S90/A80/B70/C60/D60미만. 복귀율은 참고값이며 점수 제외. 미측정 점수는null/분석대기, 순위 제외.
- 100dvh 레이아웃. 데스크톱은 측정3종·점수/콤보·코치·그래프2개·참가자진행을 함께 표시한다. 모바일은 실시간/그래프 탭으로 전환한다.
- 테스트101개/백엔드9개 통과, coverage설정 포함파일 lines98.04%, branches85.56%, functions82.53%, 빌드통과, lint오류0/기존경고12. 모델에서1~4라운드·120초 경계·중복저장방지·오프라인·점수/콤보·교대분리 검증.
- 백엔드 캐시를 최근1초 이내의 연결중 센서값만 재전송하도록 수정했다. 개발서버5173은 실행중. 백엔드 재시작은 자동승인검토가 계정사용량제한으로 실패하여 실행되지 않았다. 마지막실행상태는 별도확인필요. 사용자실행명령: backend폴더에서 `LIFEPULSE_DEV_MODE=false venv/bin/python -u backend_server.py`.


## 2026-10-28 실제 깊이·BPM·변위 복귀율 연동

이 절이 아래의 이전 펌웨어 보정/이완 미측정 설명을 대체한다. 기존 작업 내용은 보존한다.

- 펌웨어: `firmware/lifepulse_esp32/lifepulse_esp32.ino`. 기존 0·2cm 두 점 보정을 7점 보정표로 교체했다. 저항·커패시터 회로와 캘리퍼 측정에 사용한 증가 방향 표 `1219,1265,1520,1889,2230,2534,2590`이 기본값이다. OUT-A는 저항 회로 공통 신호점으로, 그 지점이 GPIO34에 연결된다. 센서 출력을 GPIO34에 직접 연결하는 이전 배선표를 이 보정값과 혼용하지 않는다.
- 10ms 목표 샘플링,100ms 목표 출력. 실시간 깊이0~6cm, 시작 간격 BPM, 완료 압박 최대 깊이·횟수 및 변위 복귀율을 전송한다. 첫 BPM은 두 시작 검출이 필요하고2.5초 미검출 후0으로 초기화한다. 시작 전0.5cm이하 원위치 확인이 필요하다.
- 복귀율=`100*(압박 최대 깊이-복귀 잔여 깊이)/압박 최대 깊이`. 지난 완료 압박의 참고값이다. 완전 이완 판정·손 압력·접촉 여부 또는 적정 이완 횟수 비율이 아니다. 평가 전은null. 실제 정확도는 하드웨어 대조가 필요하다.
- 재보정: 시리얼115200에서 `b` → 캘리퍼0cm에서 `0` →1cm에서 `1` → … →6cm에서 `6`. 순서대로 움직이고 각 숫자를 따로 보낸다. `x`로 취소. 유효한 전체 표는 NVS에 저장하며 재부팅 후 복원한다. 회로·장착·프로브 변경 후 전체 재측정한다. 이전 `z/c` 절차는 사용하지 않는다.
- 백엔드가 nullable `recoil_percent`,`residual_depth_cm`,`compression_bpm`을 검증·중계한다. 기존 프레임의 이완 값은 만들어내지 않는다. 교육생·강사·게임 화면에 이완 복귀율을 표시한다. 점수/결과 분석은 기존 깊이·속도 기준이다.
- 실행은 아래 기존 backend/frontend 명령과 동일. USB는 업로드/전원용이며 웹 전달은 기존 Wi-Fi/WebSocket 경로다. 실제 센서 사용 시 `LIFEPULSE_DEV_MODE=false`. 같은 Wi-Fi에 연결하고 secrets.h의 SERVER_IP를 서버 컴퓨터 로컬IP로 맞춘다. 자격정보는 추적/배포하지 않는다.
- 검증: ESP32 core3.3.11 실제 컴파일 성공, C++보정/검출 테스트 성공, 프론트82테스트 및 프로덕션 빌드 성공, 백엔드8테스트 성공, lint오류0(기존 경고12). 기존 전체 TypeScript 검사는 미사용 import/Vite타입/다른 컴포넌트 오류가 남아 있다. 브라우저에서 로컬 테스트 JSON의5.4cm/110BPM/82% 표시 확인. 실제 ESP32 업로드·기구 정확도 검증은 아직 하지 않았다.


Last updated: 2026-09-11 (대학리그 발표 자료 반영; 기술 상태와 테스트는 이번 수정에서 재검증하지 않음)


## 2026-09-11 현황 요약 — 모두의 창업 대학리그 자료 반영

### 검토 자료와 반영 기준

- 기준 자료: `모두의 창업 대학리그 발표.pptx`(16슬라이드, 파일 수정일 2026-09-08)의 텍스트와 `모두의 창업 대학리그 발표_Retry.pdf`(15쪽)의 전체 페이지. 두 자료는 완전히 같은 버전이 아니며, PPTX에는 MVP 슬라이드가 추가되어 있다. 아래 출처의 쪽수는 PDF 기준이다.
- 경쟁 자료: `CPR Add-On Kit 카탈로그.pdf`(2쪽, I.M.LAB 제품 사양 카탈로그). LifePulse 자체 제품 카탈로그가 아니다.
- 원본 폴더: `/Users/trudy/Downloads/모두의 창업 대학리그/`.
- `Retry_영상.mp4`와 PPTX ZIP 파일이 존재한다. 영상 재생·음성 확인 및 ZIP 내부 대조는 이번 검토 범위에 포함하지 않았다. 영상 파일의 존재만으로 정확도 검증이나 대외 시연 준비 완료를 뜻하지 않는다.
- 발표에 기재된 성과·가격·시장 가정·로드맵을 반영했다. 발표 화면이나 계획만으로 실제 센서 연동, 클라우드 저장, 판매·PoC 완료를 인정하지 않는다. 아래 기존 기술 상태와 테스트 결과는 9월 2일 기록이다.

### 제품과 현재 성과

- 팀명은 **Retry**, 제품명은 **LifePulse**. 기존 CPR 마네킹에 센서를 추가해 압박 깊이·속도 피드백과 강사 관제를 제공하는 업그레이드 방식이다.
- 핵심 고객 문제는 강사 1명이 여러 교육생의 압박을 동시에 평가하기 어렵다는 점과 기존 장비의 전면 교체 비용·구매 절차 부담이다.
- 발표상 가치 제안은 ‘5분 설치’, 기존 장비 활용, 웹 접속, 교육생별 피드백·반복 이력 관리다. **5분 설치와 주요 브랜드 2~3개 호환은 실측·호환성 검증이 필요한 목표**다.
- 발표 자료에 MVP 하드웨어 사진, 강사 화면, 교육생 화면, 결과 분석 화면이 있다(PDF 5~7쪽). 강사 화면은 ‘시연 모드·가상 센서 데이터’로 표시되어 있어 실제 다중 마네킹 동시 연결의 증거로 사용하지 않는다.
- 발표에 기재된 성과: 하나소셜벤처 유니버시티 5기 수료·우수팀 선정 및 지원금 **300만 원**, PNU 도전! 창업 동아리 지원사업 선정 및 지원금 **200만 원**. 합계 **500만 원**이며 매출과 구분한다(PDF 12쪽). 입금·집행 내역은 별도 확인하지 않았다.
- 고객 접점: 2026-09-01 김해소방서 소방관 1명 인터뷰가 발표에 명시되어 있다(PDF 4쪽). 경남 보급 수와 장비 가격은 해당 인터뷰 발언이며 전수조사 결과가 아니다. 9월 인터뷰 목표 5회가 완료되었다는 뜻도 아니다.

### 현재 가격·사업 모델 가설

출처: 발표 PDF 11쪽. 다음은 제안 가격이며 판매 실적이나 확정 계약 가격이 아니다.

| 항목 | 제안 가격 | 구성·조건 |
| --- | --- | --- |
| Starter Kit | 169만 원/kit | 센서 5개 + ESP 수집장치 + 대시보드 1년권 |
| 기관용 SaaS 갱신 | 39만 원/년 | 교육생별 이력 클라우드 저장·리포트 제공 계획 |
| 추가 센서 | 10.9만 원/모듈 | 교육 규모에 따라 증설 |
| 방문형 실습 교육 | 초빙 기본료 40만 원 + 시간당 20만 원 | CPR 강사 자격 취득 후 기관 대상 운영 계획 |

- 2시간 교육은 위 산식상 80만 원이며 발표 시장 계산의 회당 가격과 일치한다. 인원·출장비·세금·강사 수 등 계약 조건은 정해지지 않았다.
- 비교표의 ‘대당 30만 원대’는 169만 원을 센서 5개로 나눈 **약 33.8만 원**으로 해석할 수 있다. 센서 단품 가격이나 추가 모듈 10.9만 원과 같은 기준은 아니므로 비교 단위를 명시해야 한다.
- 현재 제안은 하드웨어 + 구독 + 방문 교육의 결합형이다. 고객 인터뷰와 PoC 결과에 따라 기기 중심·교육 중심·결합형 중 우선 방향을 결정한다.

### 시장 산정 — 발표 가정과 확인할 점

출처: 발표 PDF 10쪽. 산술 합계는 확인했으나 기관 수와 구매 수요는 외부 검증하지 않았다.

| 발표 구분 | 산식 | 합계 |
| --- | --- | --- |
| TAM 표기 | 키트 480곳 × 169만 원 + 교육 1,500회 × 80만 원 | 20억 1,120만 원 |
| SAM 표기 | 키트 50곳 × 169만 원 + 교육 100회 × 80만 원 | 1억 6,450만 원 |
| SOM 표기 / 3년 내 확보 목표 | 키트 20곳 × 169만 원 + 교육 10회 × 80만 원 | 4,180만 원 |

- 발표의 전체기관 12,351개는 학교 11,871 + 소방서 242 + 간호대학·간호학과 198 + 의과대학 40의 합계다. 집계 기준 연도, 출처, 중복 여부를 확인해야 한다.
- 전체기관 12,351개 중 TAM 계산에 480곳만 반영한 근거와 교육 횟수의 산정 기간이 없다. 현재 금액은 **발표의 판매·교육 가정에 따른 매출 시나리오**로 관리하고, 검증된 전체시장 규모로 단정하지 않는다.
- SaaS 갱신과 추가 센서 매출은 위 산식에 포함되지 않는다. 수익성 판단에는 원가, 교육 인건비, 유지보수비와 재구매율을 추가해야 한다.

### 경쟁 비교와 기능 상태 보정

- I.M.LAB 카탈로그 1쪽에는 실시간 피드백, 데이터 관리, CPR class 다중 교육 기능과 최대 45개 마네킹 연결이 제시되어 있다. 따라서 발표의 익명 A사 ‘다중 관제 X·데이터 저장 X’를 I.M.LAB 전체 제품군에 적용하면 안 된다. 회사·제품·요금제·포함 기능을 확정해 비교표를 다시 작성해야 한다.
- ‘웹 접속으로 운영 단순화’, ‘주요 브랜드 2~3개 호환’, ‘반복 이력 관리’는 차별화 가설이다. 경쟁사에 해당 기능이 없거나 LifePulse의 우위가 입증되었다는 의미가 아니다.
- **기존 기술 기록상 구현:** 단일 마네킹 실시간 화면, 깊이·속도 피드백, 규칙 기반 코치, 현재 세션 결과 분석.
- **추가 개발·검증 대상:** 실제 다중 기기 식별·동시 관제, 영구적인 교육생 이력·클라우드 자동 저장, 계정·기관 관리, 5개 센서 키트의 동시 작동, 설치 시간·브랜드 호환·정확도 검증.
- CPR 통계와 언론 보도는 발표의 문제 배경 자료이며 이번 수정에서 원출처를 재검증하지 않았다. 제품의 교육 효과나 실제 환자 생존율 개선을 입증하는 자료로 사용하지 않는다.

### 팀 역할

출처: 발표 PDF 14쪽. 두 구성원 모두 IT응용공학과 재학으로 기재되어 있다.

| 담당 | 역할 | 책임 범위 |
| --- | --- | --- |
| 김지윤 | PM / FE / AI | 기관 컨택, 고객 인터뷰, 사업 전략, 프론트엔드·AI 개발 |
| 제수지 | BE / H/W | 백엔드, CPR 데이터 수집·처리, 센서 설계·가공, 측정 정확도·시스템 안정성 검증 |

## What is working

- ESP32 data is accepted through the Python WebSocket server on port `8765`.
- The server accepts both the old ESP32 payload and the new versioned `reading` payload.
- The first ESP32 reading is no longer discarded while identifying the device.
- Live WebSocket state distinguishes **server connected** from **recent ESP32 data received**. A sensor frame becomes stale after one second.
- `/participant?mode=live&victim=adult` is the large, simple participant monitor.
- `/game?mode=live&victim=adult` is the game flow with score, combo, graph, and results.
- `/instructor?mode=live&victim=adult` is the one-mannequin instructor dashboard.
- `/guide` is the no-sensor, source-cited visual guide for adult/child/infant hand placement and posture.
- Game scoring uses ESP32 `compression_count` when present, so one completed compression is scored once.
- The initial game depth is `0cm`; no fake 5.5cm value or fake 108 BPM is used.
- A deterministic, evidence-based **AI CPR coach** is shared by the game, participant, and instructor screens. It requires no API key or internet connection.
- The coach prioritizes: stale/offline sensor → no compression started → depth correction → rate correction → keep current rhythm.
- The game stores actual completed compression peaks (`compressionPeaks`) and the result screen analyzes only those events: correct-depth/rate ratios, averages, shallow/deep/slow/fast count, and first-half versus second-half trend.
- Adult, child, and infant profiles are selected with `victim=adult|child|infant`; the default is adult. Current coaching ranges: adult `5–6cm`, child `4–5cm`, infant `3.5–4.5cm` around 4cm; all use `100–120회/분`.

## Files that matter

| Area | Main files |
| --- | --- |
| ESP32 | `firmware/lifepulse_esp32/lifepulse_esp32.ino` |
| ESP32 local credentials | `firmware/lifepulse_esp32/secrets.h` (ignored by Git) |
| WebSocket backend | `backend/backend_server.py` |
| WebSocket browser hook | `frontend/src/hooks/useWebSocket.ts` |
| Sensor protocol parsing | `frontend/src/live/sensorState.ts` |
| Participant / game / instructor routes | `frontend/src/App.tsx` |
| Adult / child / infant technique guide | `frontend/src/pages/CprTechniqueGuideScreen.tsx` |

## ESP32 setup

1. Copy `firmware/lifepulse_esp32/secrets.example.h` to `secrets.h` in the same folder.
2. Fill in `WIFI_SSID`, `WIFI_PASSWORD`, and the MacBook's local Wi-Fi IP in `SERVER_IP`.
3. In Arduino IDE, select **ESP32 Dev Module** and the serial port such as `/dev/cu.usbserial-110`.
4. Install these libraries if missing: `WebSocketsClient`, `Adafruit MPU6050`, `Adafruit Unified Sensor`.
5. Upload `lifepulse_esp32.ino` by USB. The saved sketch reconnects over Wi-Fi after it is powered from the battery.

### Wiring

| Device | ESP32 pin |
| --- | --- |
| MPU6050 VCC | 3.3V |
| MPU6050 GND | GND |
| MPU6050 SCL | GPIO22 |
| MPU6050 SDA | GPIO21 |
| Potentiometer GND | GND |
| Potentiometer VCC | 3.3V |
| Potentiometer OUT-A | GPIO34 |

## Run a live session

```bash
# terminal 1
cd backend
source venv/bin/activate
LIFEPULSE_DEV_MODE=false python backend_server.py

# terminal 2
cd frontend
npm run dev:host
```

Open one or more of:

- `http://localhost:5173/participant?mode=live`
- `http://localhost:5173/game?mode=live`
- `http://localhost:5173/instructor?mode=live`
- `http://localhost:5173/guide` (no sensor required)

For age-specific display criteria, append `&victim=child` or `&victim=infant`. The representative physical demonstration remains the calibrated adult mannequin.

## AI coach boundaries and sources

The label “AI” means explainable rules built from official CPR targets plus this session's data; it does **not** diagnose a patient or call an external LLM.

- Measured and scored: compression depth and rate.
- Not measured: recoil, hand placement, ventilation quality. The UI explicitly marks these as unmeasured.
- References shown in the result UI: Korean Association of CPR adult chest-compression guidance; KACPR 2025 pediatric BLS; AHA 2025 Basic Life Support; a 2025 systematic review on real-time CPR feedback during training (PubMed 40230367).

For another device, replace `localhost` with the MacBook local IP. The ESP32 and MacBook must use the same Wi-Fi network. A mobile hotspot works only while both are joined to that hotspot.

## Physical calibration still required

The firmware now requires explicit serial calibration on each reboot. It does not send depth readings before calibration.

1. Upload `firmware/lifepulse_esp32/lifepulse_esp32.ino` with `depth_calibration.h` in the same sketch folder.
2. Open Serial Monitor at 115200 baud. Hold the mechanism at physical 0cm, then send `z`.
3. Hold it at exactly 2.00cm measured with the digital caliper, then send `c`.
4. Confirm `CALIBRATED zero=..., two_cm=...`. Both increasing and decreasing ADC directions are supported. A span below 32 ADC counts is rejected.
5. Verify 0, 0.5, 1, 2, 3, 5, and 6cm against the reference. Readings now update every 100ms with 50ms sampling. There is no 1cm software dead zone; compression counting still starts at 1.5cm.
6. Repeat calibration after restarting or changing the mounting. Calibration is held in RAM and is not saved across power cycles.

If raw ADC remains unchanged throughout the first centimeter, software calibration cannot recover that movement. Inspect linkage travel, wiring, and ADC saturation. A two-point linear calibration must be verified over the full travel before depth accuracy is claimed.

## Current validation

Last recorded automated run (2026-09-02; not rerun for the 2026-09-11 document update):

- Frontend: 69 tests passed.
- Backend: 7 tests passed.
- Frontend production build passed.
- Lint passed with 11 pre-existing warnings and no errors.

## Remaining work

## 2026 business validation and commercialization plan

### Six-month objective

Within six months, determine whether LifePulse should prioritize **device sales**, an **education service**, or a combined model, and secure enough technical, customer, and field evidence to make a commercialization decision. Use the result to define and recruit the development and operating roles required for the chosen direction.

Decision evidence must include:

- Whether institutions primarily want the sensor device, the education program, or both.
- Which model shows stronger demand and a realistic purchasing route: direct device sales, education delivery, institutional licensing, public procurement, partnership distribution, or a hybrid.
- Whether an education-led business can expand beyond one-off mannequin sales through instructor programs, institutional training packages, recurring assessment/reporting, or train-the-trainer delivery.
- At least five expert/customer interviews, three institutional demonstrations, two education-institution PoCs targeted for December 2026, and a path toward paid adoption discussions in February 2027. These are targets, not completed outcomes.

### Deliverables and completion dates

The September university-league deck supersedes the earlier September corrected-prototype and October one-demonstration schedule. Existing MVP calibration continues now; the next prototype iteration is targeted for November–December. December is a prototype target, not a confirmed commercial release date.

| Deliverable | Completion target | Current status / definition of done |
| --- | --- | --- |
| Product introduction and demonstration assets | September 2026 | Presentation PPTX/PDF and video file exist. Review video content, reconcile claims and prepare the institution-specific introduction. |
| Customer interviews and accuracy testing | September 2026 | Five interviews targeted; one September 1 fire-station interview is cited. Record reference measurements and prioritized feedback. |
| Institutional demonstrations | October 2026 | Three demonstrations targeted; retain participant feedback and technical findings. Everyone's Startup 1R advancement is a target, not a confirmed selection. |
| Instructor qualification and next prototype build | November 2026 | Target the CPR general-public instructor qualification and begin the next prototype iteration. Qualification is not recorded as obtained. |
| Prototype completion and PoC | December 2026 | Complete prototype and conduct PoCs at two education institutions, subject to institutional agreement and a defined protocol. |
| PoC analysis and pilot discussions | January 2027 | Analyze accuracy, training outcomes and operating feedback; discuss pilot conditions. |
| Paid adoption discussions and business model | February 2027 | Discuss paid deployment and refine pricing, delivery costs and the preferred business model. No paid contract is confirmed. |

Every external introduction must distinguish **implemented**, **being validated**, and **planned** functions. State December 2026 as the current prototype completion target; the exact day and commercial release date remain unconfirmed.

### 1. Technical validation

- Purchase or secure access to reference measurement hardware capable of independently checking compression depth and rate.
- If specialized measurement or certification work cannot be performed internally, commission a qualified testing company or laboratory and retain its test method and result report.
- Compare the LifePulse prototype with the reference device for **at least 100 compression measurements**; graduation-exhibition visitor sessions may be used only when the reference setup, consent, and data-quality conditions are satisfied.
- Measure and report depth error, rate error, repeatability, failed readings, latency, and disconnection/recovery behavior. Do not report only an average score.
- Validate the actual function coverage first. Clearly separate measured functions such as depth and rate from currently unmeasured functions such as recoil, hand placement, and ventilation quality.
- Correct the problems found in testing and repeat the same protocol on the corrected prototype.
- Ask connected industry professionals about sensor structure, durability, calibration, mannequin compatibility, and procurement. If permission and an appropriate opportunity are provided, inspect the internal structure of a mannequin without damaging third-party property.
- Ask nursing, medical, and relevant faculty which evaluation criteria matter most in formal CPR education and what error range they would accept for an educational aid.
- Before commercial sale, obtain expert advice on product classification, required government approval/certification, testing standards, labeling, and permissible educational claims.

### 2. Education-effect validation

The first claim to verify is improvement in **training performance**, not improvement in real-patient survival.

- Use a pre-test/post-test design under the same mannequin, time limit, instructions, and scoring criteria.
- Suggested groups: conventional instructor feedback versus LifePulse-assisted feedback. If a control group is not feasible, use repeated measures for the same trainees and state the limitation.
- Primary measures: proportion of compressions within the target depth range, proportion within the target rate range, mean absolute depth error, mean rate error, and session completion rate.
- Secondary measures: improvement after repeated attempts, skill retention in a delayed follow-up test, time required for instructor observation/recording, learner confidence, instructor usability, and intention to reuse.
- Record sample size, participant type, equipment, protocol, exclusions, and raw measurement method. Use anonymized identifiers and obtain institutional/ethics guidance before collecting identifiable student data.
- Cross-check a sample of sessions with the purchased reference hardware or an external testing provider. A successful educational pilot requires both technically credible measurements and measurable improvement or operational benefit.
- Agree on the protocol and acceptable error with nursing/medical faculty and CPR educators before treating the results as evidence.

### 3. Customer and market validation

Complete at least **five interviews** with nursing faculty, medical faculty, CPR instructors, education administrators, purchasing staff, fire-service stakeholders, or safety-training institutions.

Each interview must establish:

- Whether the respondent needs a device, an education program, instructor support, assessment/reporting, or a bundled service.
- Current mannequin inventory, class size, instructor-to-trainee ratio, pain points, current budget, purchasing authority, approval steps, and acceptable measurement error.
- Whether the institution can purchase directly or needs a higher-level agency, university headquarters, distributor, grant, public-procurement route, or partnership agreement.
- Willingness to pilot, conditions for issuing an LOI or paying for a PoC, and a realistic price or budget range.
- Which revenue model is preferred: device purchase, rental, per-class education fee, annual institutional license, maintenance/calibration plan, instructor certification, or bundled contract.

Market hypotheses to test:

- A fire-station contact reported that fewer than 10 of 18 fire stations in Gyeongnam may hold smart CPR training mannequins because units can cost approximately KRW 5-6 million, while basic mannequins are available for around KRW 150,000. Treat these figures as interview evidence that requires confirmation, not as published market facts.
- Individual fire stations may lack direct purchasing capacity; therefore, test agreements and distribution through the National Fire Agency, provincial fire headquarters, municipalities, universities, education offices, or other upper-level institutions.
- The annual KRW 390,000 SaaS price alone may not support a durable business. Compare it with higher-value education and operating models such as institutional training packages, instructor-led programs, equipment rental, calibration/maintenance, assessment reports, train-the-trainer programs, and hardware-plus-service contracts.

### 4. Institutional outreach

Priority targets:

- Fire stations, the National Fire Agency, and provincial fire headquarters.
- Safety Experience Centers and safety-learning centers.
- Busan, Ulsan, and Gyeongnam safety-education institutions.
- Nursing and medical schools, simulation centers, CPR training providers, first-aid organizations, and other public or private safety-education institutions.

Outreach sequence:

1. Send a concise cold email with the company/product introduction, demonstration video, exact prototype completion date, and a request for a 30-minute interview or demonstration.
2. Track delivery, open, reply, role, institution, and next action in a contact list.
3. When an email is read but unanswered, follow up by phone. Lead with the institution's operating problem, ask whether the person owns education or purchasing decisions, and request either a short interview or a referral to the responsible person.
4. During nursing/medical faculty demonstrations, conduct the customer interview in the same visit and ask for evaluation criteria, acceptable error, pilot requirements, and introductions to decision makers.
5. Aim to convert outreach into five completed interviews, three institutional demonstrations, and agreements toward two education-institution PoCs in December 2026.

### 5. Marketing and expansion

- Secure a booth or shared demonstration opportunity at a fire/safety exhibition and prepare a live demonstration that can be completed reliably on site.
- Use the exhibition to meet domestic and international fire, safety, medical-simulation, education, distribution, and public-procurement stakeholders.
- Prepare a booth kit: working prototype, backup parts and offline mode, demonstration video, one-page introduction, QR inquiry form, reference measurement summary, pilot offer, and lead log.
- Follow up with qualified leads within two business days and classify them as interview, pilot, channel partner, technical adviser, certification adviser, or future lead.

### 6. Milestones

The authoritative current schedule is the deliverables table above, based on presentation PDF page 13: September 2026 interviews/testing → October three demonstrations → November qualification/build → December prototype and two PoCs → January 2027 analysis/pilot discussions → February paid-adoption discussions. Earlier August–November dates were planning assumptions, not completion records.

### 7. Go/no-go decision at six months

- **Product-led:** choose this path when institutions show purchase intent for retrofit hardware and the prototype meets the agreed accuracy, reliability, installation, regulatory, and support requirements.
- **Education-led:** choose this path when institutions prefer delivered training, instructor support, rental, or measurable learning outcomes over owning devices, and at least one repeatable paid delivery model is validated.
- **Hybrid:** choose this path when hardware unlocks adoption but most recurring value comes from training, assessment, maintenance, calibration, reporting, or institutional operation.
- **Redesign or stop:** do not scale claims or sales if reference testing remains outside the accepted error, the education pilot shows no meaningful performance/operational benefit, or repeated interviews reveal no viable buyer and budget route.

### 8. Staffing after direction is chosen

- Product-led needs: embedded/hardware engineering, calibration and quality assurance, enclosure/manufacturing, certification/regulatory support, institutional sales, and field support.
- Education-led needs: CPR education experts/instructors, curriculum and assessment design, institutional partnerships, program operations, sales, and evidence/data analysis.
- Hybrid needs a smaller cross-functional core plus external testing, certification, manufacturing, and instructor partners until demand is repeatable.

### Required before demo claims

- Perform the physical calibration and write the measured raw values into the firmware.
- Test wireless operation using a power bank, then test Wi-Fi loss and reconnect.
- Check browser-to-sensor display latency using a single phone video; target typical latency under 250ms.
- Exercise the AI-coach boundaries at 80, 100, 120, and 140 BPM and with ruler positions 0, 3, 5, and 6cm. Confirm participant and instructor display the same coach action and criterion.

### Future improvements, not required today

- Multiple ESP32 / multiple mannequin identity and instructor station cards.
- OTA firmware update and a Wi-Fi setup portal.
- Recoil percentage and hand placement sensors; they are currently intentionally shown as unmeasured.
- Phone-camera posture assessment: only after collecting consented, staged training clips and validating the model against a checklist; it must remain educational feedback, not a diagnosis.
- Persisted session history and user accounts.
- Resolve the non-blocking frontend lint warnings and split the production JavaScript bundle.
