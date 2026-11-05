# LifePulse CPR Project Status

## 2026-11-05 후속 — 실습 상단 상태 카드 정리·참가자 이름 표시

- 실습 진행 상태 카드의 진행률 막대를 압박 속도 게이지와 같은 초록색(`#12b878`)으로 통일했다. 브라우저 계산 스타일에서도 동일한 RGB 값을 확인했다.
- 완료 압박 횟수 문구가 길어져도 `지금 종료` 버튼이 줄어들거나 잘리지 않도록 상태 카드 레이아웃을 가변 본문+고정 버튼 그리드로 변경하고 버튼 줄바꿈을 막았다. 데스크톱 브라우저에서 버튼이 카드 안에 유지되는 것을 확인했다.
- 왼쪽 `이완 복귀율` 제목에 굵기 950을 적용했다.
- 실습 중 왼쪽 위 참가자 제목은 등록된 참가자 이름을 사용한다. 등록 정보가 없는 예외 상황에서만 기존 `N번 참가자` 문구를 대체값으로 사용한다.
- 검증: 프론트 156개 테스트와 프로덕션 빌드 통과, lint 오류 0(기존 경고 12개), `git diff --check` 통과. 브라우저 계산 스타일에서 진행률 초록색, 제목 굵기 950, 버튼 `nowrap` 및 카드 내부 배치를 확인했다.

## 2026-11-05 후속 — localhost:5174 리더보드 Failed to fetch 수정

- 사용자가 연 `http://localhost:5174/leaderboard`에서 REST API가 `http://localhost:5173` Origin만 허용해 브라우저 CORS 차단으로 `Failed to fetch`가 발생했다. 백엔드 자체와 DB는 정상 실행 중이었다.
- 백엔드는 localhost/127.0.0.1의 모든 개발 포트와 API 요청 호스트와 동일한 호스트의 HTTP(S) Origin을 허용한다. 추가 Origin은 `LIFEPULSE_CORS_ORIGIN`에 쉼표로 지정할 수 있다. 다른 외부 호스트는 계속 거부한다.
- 프론트 API 주소는 고정 localhost 대신 현재 페이지의 프로토콜·호스트와 API 포트 8766을 조합한다. 따라서 LAN의 다른 기기에서 Mac 주소로 프론트를 열어도 그 Mac의 API를 호출한다.
- 백엔드를 재시작해 ESP32가 다시 연결된 것을 확인했다. Origin `http://localhost:5174` 요청에서 HTTP 200과 CORS 헤더, 참가자 4명 데이터를 확인했고 실제 `localhost:5174/leaderboard` 브라우저에서도 4명이 표시된다.
- 프론트 155개·백엔드 74개 테스트와 프로덕션 빌드가 통과했다.

## 2026-11-05 후속 — 리더보드 채점 버전 전환 호환

- 실제 DB에는 참가자 4명의 기록이 저장되어 있었지만 모두 `scoring_version=1`이었다. 프론트 리더보드가 새 기준인 버전 2만 요청해 `/leaderboard`가 빈 화면으로 표시된 원인을 확인했다.
- 리더보드는 버전 1과 2를 함께 조회한다. 같은 참가자가 두 버전에 있으면 점수, 적정 깊이 비율, 적정 속도 비율, 최대 콤보 순으로 더 좋은 기록 하나를 남기고 전체 순위를 다시 계산한다. 실행 중인 백엔드를 재시작하지 않아도 과거 기록과 새 기록이 함께 표시된다.
- 공개 리더보드의 이름·학번 마스킹은 유지한다. 버전 1에 점수 계산 자료가 없던 기록은 참가자를 숨기지 않고 0점·등급 미정으로 표시한다.
- 실제 `/leaderboard` 브라우저 확인에서 DB의 4명(권*숭, 제*지, 김*윤, 냐*)과 오늘 참가자 4명·총 도전 4회를 확인했다. 관련 병합 테스트를 추가했고 프론트 테스트 155개가 통과했다.

## 2026-11-05 후속 — 실제 센서 원위치 오프셋 기록 차단 수정·5단계 판정 복원

- 실제 로컬 WebSocket 읽기에서 원위치 depth 0.65–0.83cm, compression_count 266, compression_peak_cm 5.41, compression_bpm 68.97 필드를 확인했다. 프론트가 원위치 0.5cm 이하만 기다려 전체 라운드의 완료 압박을 버리는 원인을 수정했다. 시작 깊이가 펌웨어 시작 기준인 1.5cm 미만이면 기록을 준비하며, 이미 눌린 채 시작한 경우 첫 완료만 제외한 후 다음 완료부터 수집한다. 원시 센서와 펌웨어 보정은 변경하지 않는다.
- 중앙 PRESSING 표시는 제거하고 요청된 깊이·속도 5단계 판정을 표시한다. 완료 전에는 관측된 최고 깊이로 미리 판정하고 완료 후에는 직전 완료 판정을 이완 중에도 유지한다. 속도가 없는 첫 압박은 깊이 기준 임시 판정임을 명시하며 실제 점수는 속도가 측정된 완료 기록으로만 계산한다. 첫 압박 상승 중 순간적인 미흡 깊이는 더 깊게 안내한다. 기준 밖 완료 압박의 MISS는 그대로 유지한다.
- 완료 기록이 정상 수집되어 최종 점수·평균 깊이·속도·복귀율·횟수까지 전달된다. 결과 진입 때 스크롤을 맨 위로 돌려 점수와 평균 카드부터 표시한다. 결과 그래프 요약·실습 그래프 제거는 유지한다.
- 테스트: 네 가지 사용자 예시, 판정 유지, 깊이 임시 판정, 측정된 MISS 보존, 원위치 0.7cm 센서 완료 기록→최종 75점·평균 깊이 5.1cm·속도 120, 결과 카드 렌더링을 검증했다. 프론트 154개 테스트·빌드 통과, lint 오류 0(기존 경고 12개). 브라우저 30초 시연에서 최종 78점·평균 깊이 4.9cm·속도 115회/분·49회 표시를 확인했다. 실물 압박 재실습은 사용자 확인이 필요하다.

## 2026-11-05 후속 — 압박 시작 즉시 READY 해제·결과 파형 요약

- READY는 압박 전 대기에서만 표시한다. 현재 깊이 또는 라운드 기록에서 1.5cm 이상 움직임을 감지하면 완료 횟수·속도가 아직 없어도 PRESSING / 압박 중으로 즉시 전환한다. 이완해도 해당 라운드 기록이 있어 READY로 돌아가지 않으며, 완료 압박과 속도가 확보되면 기존 5단계 판정을 표시한다.
- 실습 하단의 실시간 그래프는 제거했다. 원시 history 수집은 유지하고 결과 그래프에서 0.5초 단위로 깊이 최저·최고값(최대 120점), 속도 평균(최대 60점)을 시간 순으로 표시한다. 깊이의 압박·이완 파형을 보존하고 SVG 곡선으로 연결한다. 30초 시간축과 목표 밴드는 유지한다.
- 프론트 테스트 146개·빌드 통과, lint 오류 0(기존 경고 12개). 브라우저에서 압박 진행 후 PERFECT 전환, 실습 그래프 제거, 종료 후 요약 곡선 표시를 확인했다. 확인 당시 프론트 5173, 백엔드 8765/8766 실행 중이며 이번 변경은 프론트에 즉시 반영된다.

## 2026-11-05 추가 — 요청 범위 기반 실습 판정·점수 통일 및 실시간 그래프

- 성인 깊이 PERFECT 5–6cm, GREAT 4.25–4.99/6.01–6.90cm, GOOD 3.50–4.24/6.91–7.80cm, BAD 2.75–3.49/7.81–8.70cm, 그 외 MISS. 속도 PERFECT 100–120, GREAT 85–99/121–138, GOOD 70–84/139–156, BAD 55–69/157–174, 그 외 MISS. 깊이는 소수 둘째 자리, 속도는 정수로 비교하며 두 항목 중 낮은 판정을 사용한다. 소아·영아는 기존 목표 깊이에 동일한 비율 여유를 적용한다. 이완은 판정에서 제외한다.
- 현재 깊이 숫자·게이지·그래프는 센서 프레임을 계속 표시하되 중앙 판정과 깊이 안내는 직전 완료 압박을 유지해 이완 중 MISS가 반복되지 않는다. 첫 압박·속도 측정 대기는 READY로 안내한다. 왼쪽 이완은 최신 센서 recoil_percent, 오른쪽은 실제 누적 압박·경과 시간·진행률을 표시한다.
- 깊이·속도 곡선 그래프를 접힌 메뉴 밖에 상시 표시한다. 최근 100개 프레임과 목표 밴드·값 축을 사용하며 곡선 보간은 표시 전용이다. 측정·압박 검출·보정 프로토콜은 변경하지 않는다.
- 최종 100점 점수는 유효 속도가 있는 완료 압박의 PERFECT 100/GREAT 75/GOOD 50/BAD 25/MISS 0점 평균이다. 첫 압박의 미확인 속도는 제외하고 기록이 없으면 분석 대기다. PT와 콤보 규칙은 유지한다.
- 새 실습 저장은 scoring_version=2로 서버에서도 동일하게 재계산하고 새 랭킹은 버전 2를 조회한다. 과거 버전 1 기록·검증 로직은 보존한다. 실행 중인 백엔드는 변경 코드를 적용하려면 재시작해야 한다. /game 구형 화면의 누락된 모니터 props도 보완했으며 새 실습 흐름은 /participant다.
- 검증: 프론트 145개, 백엔드 73개 테스트·프로덕션 빌드 통과, lint 오류 0(기존 경고 12개). 임시 DB/API에서 75점 저장과 버전 2 랭킹 반영 확인. 브라우저 30초 시연 결과 78점·4,070 PT 확인. 전체 tsc는 기존 파일들의 미사용 import, PlayerResultCard의 grade props, scenario의 nullable recoil 등 오류가 남아 있으며 이번 점수 변경과는 별도다. 실제 센서 압박·이완 동작은 현장 확인이 필요하다.

## 2026-11-05 추가 — 5단계 압박 판정·콤보 적용

- 실습 화면용 압박 판정을 `MISS / BAD / GOOD / GREAT / PERFECT` 5단계로 교체했다. 센서 원본 깊이·속도 측정과 완료 압박 검출 방식은 변경하지 않았다.
- 대상별 목표 깊이 범위 밖 1cm당 40점, 속도 100–120회/분 밖 1BPM당 2점을 감점해 각각 100점 만점으로 만들고, 둘 중 낮은 점수를 일치율로 사용한다. 100은 PERFECT, 90–99 GREAT, 80–89 GOOD, 70–79 BAD, 70 미만 MISS다.
- 측정된 이완 복귀율이 90% 미만이면 깊이·속도 일치율이 100이어도 PERFECT를 GREAT로 제한한다. 복귀율 값이 없는 센서는 사용자 예시대로 깊이·속도만으로 판정한다.
- 기본 PT는 MISS 0, BAD 5, GOOD 10, GREAT 15, PERFECT 20이다. MISS·BAD는 콤보 초기화, GOOD은 기존 콤보 유지, GREAT·PERFECT는 콤보 +1이며 기존 5/10/20 콤보 ×2/×4/×8 배수를 PT에 적용한다.
- 중앙 리듬 가이드는 현재 깊이·속도의 단계, 일치율, 깊이 점수와 속도 점수를 표시한다. 상단 게임 PT와 콤보는 완료 압박 이벤트가 들어올 때 확정되며, 기존 서버 저장·전체 랭킹용 100점 정확도 계산은 호환성을 위해 유지한다.
- 예시 검증: 5.4cm+110BPM=PERFECT, 5.4cm+125BPM=GREAT, 4.5cm+110BPM=GOOD, 4.0cm+130BPM=MISS. 프론트 테스트 122개, 프로덕션 빌드, lint 오류 0으로 통과했고 브라우저 시연에서 단계·콤보·PT 갱신을 확인했다.

## 2026-11-05 추가 — 실시간 깊이와 현재값 판정 복원

- 실습 대시보드의 큰 깊이 숫자와 세로 게이지를 직전 완료 압박 최고값이 아니라 센서의 현재 `depth` 프레임에 다시 연결했다. 따라서 누르는 동안과 이완하는 동안 값이 약 100ms 주기로 변한다. 콤보·점수·저장은 기존처럼 완료 압박 이벤트만 사용한다.
- 중앙 리듬 가이드의 화면 판정을 현재 깊이와 현재 속도로 분리했다. 현재 깊이가 대상별 목표 범위면 속도가 범위를 벗어나도 `GOOD`, 깊이와 속도 100–120회/분이 모두 맞으면 `PERFECT`, 깊이가 목표 밖이면 교정 안내를 표시한다.
- 깊이 카드의 안내도 현재 깊이를 기준으로 `더 깊게`, `조금 얕게`, `적정 깊이`가 즉시 바뀌며 대상별 성인·소아·영아 깊이 범위를 그대로 사용한다.
- 관련 세션·대시보드·화면 테스트 33개, 변경 파일 lint와 프로덕션 빌드가 통과했다. 브라우저 시연에서 깊이 숫자가 5.5→0.6→2.1cm처럼 프레임마다 변하고, 5.5cm·112회/분에서 `PERFECT`, 목표 밖에서는 교정 안내로 전환되는 것을 확인했다.

## 2026-11-05 추가 — 실습 대시보드 완료 압박 이벤트 연동

- 새 실습 대시보드의 이완 복귀율, 진행 상태, 콤보·배수, 리듬 가이드를 펌웨어의 완료 압박 이벤트(`compression_count`, `compression_peak_cm`, `compression_bpm`, `recoil_percent`)에 연결했다. 평균 깊이·속도와 적정 압박 비율도 현재 프레임이 아니라 누적 완료 압박으로 계산한다.
- 정확 압박은 대상별 목표 깊이와 100–120회/분을 모두 만족할 때이며 콤보 +1, 기본 +20 PT다. 근접 압박은 깊이 목표 ±1cm와 85–135회/분을 만족할 때 +10 PT이고 콤보는 초기화한다. 나머지와 속도 미확인 압박은 +0 PT·콤보 초기화다. 5·10·20콤보에서 ×2·×4·×8 배수를 정확 압박 점수에 적용한다.
- 이완 복귀율은 직전 완료 압박의 변위 기준으로 90% 이상 `완전 이완`, 80–89% `조금 더 이완`, 80% 미만 `충분히 이완` 안내를 표시하며 점수에서는 제외한다. 센서 연결 대기·첫 압박 대기·진행 중 누적 횟수·마지막 5초·종료 상태도 실제 상태에 따라 바뀐다.
- 리듬 가이드는 직전 완료 압박 속도가 100 미만이면 빠르게, 120 초과면 느리게, 100–120이면 유지 안내를 표시한다. 중앙 ECG는 목표 110회/분 박자로 움직이고, 기존 한국어 음성 코치를 실제 토글 버튼에 연결했다.
- 기존 30초 제한 시간과 센서 측정·저장 프로토콜은 유지한다.
- 관련 세션·대시보드·화면·음성 테스트 39개, 변경 파일 lint와 프로덕션 빌드가 통과했다. 브라우저 시연에서 완료 압박 누적에 따라 이완 96%, 18회 진행 상태, 점수·콤보, 정확도·평균값과 PERFECT 리듬 안내가 함께 갱신되는 것을 확인했다.

## 2026-11-05 추가 — 참가자별 실습 시간 30초

- 팀 실습의 참가자별 제한 시간을 120초에서 30초로 변경했다. 남은 시간은 `00:30`부터 시작하고 30초에 자동 종료·저장·다음 참가자 전환 또는 최종 결과로 이동한다.
- 설정·교대·결과 안내와 진행률을 30초 기준으로 맞췄고, 결과 그래프 시간축도 `0초 · 15초 · 30초`로 변경했다.
- 센서 측정, 압박 판정, 점수 계산과 저장 데이터 구조는 변경하지 않았다.

## 2026-11-05 추가 — 결과 그래프 세로 높이 확대

- 결과 화면의 참가자별 압박 깊이·속도 그래프 높이를 데스크톱 360px, 모바일 300px로 확대해 세로 변화를 더 쉽게 구분하도록 했다. 두 그래프의 나란한 배치와 모바일 한 열 배치는 그대로 유지한다.
- SVG 내부 세로 좌표 영역을 130에서 250으로 늘려 축과 목표 구간이 실제로 길어지게 하고, 축·제목·목표 글자를 확대했다. 원시 프레임은 2초 단위 표시값으로 요약해 깊이는 구간 최대값, 속도는 구간 평균값을 그리므로 깊이 파형도 점 간격을 두고 읽을 수 있다.
- 그래프 데이터, 축 범위, 목표 구간과 센서 측정·채점·저장 로직은 변경하지 않았다.
- 관련 화면 테스트 10개, 변경 파일 lint와 프로덕션 빌드가 통과했고, 브라우저에서 길어진 세로축·확대된 글자·간격을 둔 시계열과 결과 화면 스크롤을 확인했다.

## 2026-11-05 추가 — 좌우 코치 피드백과 네온 ECG 하트

- 깊이·속도 수치 카드 아래의 개별 피드백 박스를 제거하고 `실시간 CPR 코치` 영역 안으로 옮겼다. 왼쪽은 깊이 안내와 직전 완료 깊이, 오른쪽은 속도 안내와 직전 속도를 동시에 유지해 표시한다. 기존 깊이·속도 판정 기준과 마지막 완료 압박 값만 사용한다.
- 코치 중앙에 심전도 선과 하트가 이어진 코드 기반 SVG를 추가하고 시안 이미지를 복제하지 않은 청록·분홍 네온 글로우, 선 추적, 심장 박동 효과를 적용했다. 압박 3회 연출 때 양쪽에 다섯 개씩 더 큰 다색 하트가 상승하며, 교정/콤보 문구는 중앙 하트를 가리지 않도록 아래에 배치한다.
- 밝은 배경을 유지하고 모션 감소 설정에서는 박동·선 추적·상승 이동을 정지한다. 센서 측정·채점·저장 로직은 변경하지 않았다.
- 관련 프론트 테스트 17개, 변경 파일 lint와 프로덕션 빌드가 통과했다. 브라우저 시연에서 좌우 안내, 중앙 네온 심전도·하트, 확대 하트 효과와 반응형 배치를 확인했다.

## 2026-11-05 Documents 펌웨어 폴더 반영

- 사용자가 지정한 `/Users/jesuji/Documents/lifepulse_esp32/`의 `lifepulse_esp32.ino`, `depth_calibration.h`, `compression_tracker.h`, `secrets.h`를 프로젝트의 `firmware/lifepulse_esp32/`에 복사해 Arduino 업로드 기준 경로를 프로젝트 쪽으로 통일했다. 복사한 설정의 Wi-Fi 자격정보는 유지하고 `SERVER_IP`만 현재 Mac 주소 `192.168.0.14`로 맞췄다. `secrets.h`는 계속 Git 제외 상태이며 자격정보를 출력하거나 커밋하지 않는다.
- 두 위치의 메인 `.ino`와 깊이 보정·압박 추적 헤더는 복사 전부터 해시가 동일했다. 따라서 무압박 상태에서 0.3~4cm가 나타나는 증상은 펌웨어 버전 차이가 아니라 NVS에 저장된 7점 보정값, 원위치 기구 상태 또는 GPIO34 아날로그 입력 안정성을 확인해야 한다.
- 복사 후 세 코드 파일이 원본 폴더와 일치함을 확인했고, C++ 깊이 보정·압박 추적 테스트가 통과했다. 실제 보드에는 프로젝트 경로의 스케치를 다시 업로드하고 0~6cm 전체 재보정을 수행해야 한다.

## 2026-11-05 추가 — 깊이·속도 그래프를 결과 화면으로 이동

- 팀 실습 진행 화면에서 실시간 깊이·속도 그래프와 모바일 그래프 전환 탭을 제거했다. 진행 중에는 현재 깊이·속도·복귀율, 코치 피드백, 게임 점수·콤보에 집중한다.
- 각 라운드에서 기존 방식으로 수집하던 `history`를 그대로 결과에 보존하고, 최종 결과 카드 아래 `참가자별 깊이·속도 기록`에서 참가자마다 두 그래프를 표시한다. 결과 화면 전체는 세로 스크롤되며 모바일에서는 그래프가 한 열로 배치된다.
- 센서 측정·프레임 기록·깊이/BPM 계산·채점·저장 방식은 변경하지 않았다. 관련 프론트 테스트 22개, 변경 파일 lint와 프로덕션 빌드가 통과했고 브라우저 시연에서 진행 화면 그래프 제거와 종료 후 스크롤 그래프를 확인했다.

## 2026-11-05 실제 센서 연결 준비 점검

- 로컬에서 `backend_server.py` 프로세스가 WebSocket `8765`와 REST API `8766`을 모두 정상 LISTEN 중인 것을 확인했다. `8765`에는 ESTABLISHED 연결이 없어 ESP32는 아직 백엔드에 접속하지 않은 상태다. 백엔드의 마지막 출력이 `REST API 서버 시작 중`인 것 자체는 센서 대기 상태에서 오류가 아니다.
- 현재 Mac의 `en0` IPv4는 `192.168.0.14`, ESP32 USB 포트는 `/dev/cu.usbserial-110`으로 확인했다. 네트워크를 바꾸거나 DHCP 주소가 변경되면 IP를 다시 확인해야 한다.
- 무시 파일인 `firmware/lifepulse_esp32/secrets.h`가 없어서 로컬 템플릿을 생성하고 `SERVER_IP`에 현재 IP를 넣었다. `WIFI_SSID`와 `WIFI_PASSWORD`는 계속 자리표시자이므로 사용자가 실제 전시장 2.4GHz Wi-Fi 값으로 바꾼 뒤 `lifepulse_esp32.ino`를 다시 업로드해야 한다. 자격정보는 추적하거나 공유하지 않는다.

## 2026-11-05 추가 — 참가자 정보 화면 비밀번호 제거

- `/admin`은 로그인 폼 없이 바로 참가자 정보 조회를 시작한다. 백엔드의 `GET /api/v1/admin/attempts`와 `GET /api/v1/admin/export.csv`만 인증 없이 허용했으며, 이벤트 변경·기록 변경·통계·DB 백업 등 나머지 관리자 API는 기존 세션 인증을 유지한다.
- 따라서 참가자 정보 화면 사용에는 `LIFEPULSE_ADMIN_PASSWORD_HASH`가 필요하지 않다. 백엔드 서버와 프론트엔드만 실행하면 목록·검색·CSV를 사용할 수 있다.
- 같은 네트워크에서 프론트/API 주소에 접근할 수 있는 사람도 이름·학번·전화번호를 조회할 수 있으므로 전시 운영망을 신뢰할 수 있는 범위로 제한해야 한다. 공개 랭킹 API는 계속 연락처를 반환하지 않는다.
- 프론트 관리자 테스트 3개·빌드·변경 파일 lint와 백엔드 전체 57개 테스트가 통과했다. 브라우저에서 비밀번호 없이 참가자 화면으로 직접 진입하는 것을 확인했다.

## 2026-11-05 추가 — 관리자 화면 참가자 목록 단순화

- `/admin` 로그인 후 화면에서 운영 현황·센서 상태·이벤트 생성/종료·DB 백업·기록 무효/복원 UI를 제거했다. 참가자 정보 표와 이름/학번/전화번호 검색, 새로고침, 연락처 포함 CSV, 로그아웃만 표시한다.
- 참가자 표는 학번·이름·전화번호·점수·등급·압박 수·평균 깊이·완료 일시만 보여준다. 백엔드 저장과 기존 관리자 API는 변경하지 않았다.
- 관리자 관련 테스트 3개, 변경 파일 lint와 프로덕션 빌드가 통과했다.

## 2026-11-05 추가 — 밝은 관리자 화면

- `/admin` 로그인과 대시보드를 짙은 남색에서 흰색·연한 하늘색 기반 테마로 변경했다. 헤더, 운영 현황 카드, 입력창, 참가자 표, 페이지 이동과 다운로드/관리 버튼을 같은 밝은 색 체계로 맞췄다.
- 전화번호와 유효 상태는 밝은 화면에서도 구분되도록 파랑·초록 대비를 유지하고, 센서 미연결과 오류·무효 처리는 연한 노랑·빨강 안내로 표시한다. 관리자 인증·참가자 조회·저장·CSV 기능은 변경하지 않았다.
- 관리자 관련 프론트 테스트 3개와 프로덕션 빌드가 통과했고, 브라우저에서 밝은 로그인 화면을 확인했다.

## 2026-11-05 추가 — 관리자 참가자 연락처 목록·CSV

- `/admin` 로그인 후 `참가자 정보 · 실습 기록` 표에서 이름·학번·전화번호·점수 등을 확인한다. 동일 참가자의 재도전은 실습별 행으로 표시한다. 이름/학번/전화번호 검색, 미입력 전화번호 표시, 빈 검색 결과·조회 실패·로그인 만료 처리를 보완했다. 모바일은 표 가로 스크롤을 사용한다.
- 관리자 전용 `/api/v1/admin/attempts` 조회에 `participants.phone`을 포함하고, CSV에 phone 열을 추가했다. 전화번호는 하이픈을 넣어 Excel에서 앞자리 0이 유지되게 하고 UTF-8 BOM으로 한글을 보존한다. 참가자 텍스트의 수식 접두어도 중립화한다. CSV 응답의 content-type/charset 지정 오류를 수정했다.
- 연락처는 기존 관리자 인증 뒤에서만 제공한다. 공개 랭킹은 기존 마스킹을 유지하며 전화번호를 반환하지 않는다. 측정·채점·실습 종료 후 저장·demo 미저장·전화번호 선택 입력은 유지한다.
- 검증: 프론트 114개 테스트, 백엔드 57개 테스트 통과. 프론트 빌드와 변경 파일 lint 통과. 임시 SQLite와 API 서버에서 저장→조회/검색→CSV, 비로그인 차단과 공개 랭킹의 연락처 비노출을 검증했다. 실제 DB와 분리된 가상 참가자 화면으로 브라우저 로그인·전화번호 검색·목록 표시를 확인했다.
- 테스트 의존성은 `/private/tmp/cpr-admin-venv`에 설치했다. 실제 `backend/venv`에는 aiohttp가 없어 `venv/bin/python -m pip install -r requirements.txt`가 필요하다. 이번 작업에서 운영용 DB·관리자 비밀번호는 생성/변경하지 않았다. 확인 당시 기본 API 포트 8766에는 서버가 없었다. 실제 사용 시 기존 백엔드를 의존성과 관리자 해시 환경변수(`LIFEPULSE_ADMIN_PASSWORD_HASH`)가 설정된 환경에서 실행해야 한다. `LIFEPULSE_DB_PATH` 미지정 시 `backend/lifepulse.db`를 사용한다. 임시 검증 서버는 작업 후 종료한다.

- 후속 UI 조정: 코치 문구·콤보 표시를 다음 3회 주기의 피드백이 도착할 때까지 유지한다. 자동 삭제 타이머와 퇴장 페이드를 제거했으며, 하트만 짧게 떠올라 사라진다. 연결 끊김·새 라운드에서는 기존대로 대기 안내로 전환한다.

- 후속 UI 조정: 화면 코치 팝업·하트는 유효 완료 압박 기록 3회마다 한 번 표시한다. 중간 렌더가 건너뛰어도 3회 구간을 넘었는지 확인하며, 센서 샘플 갱신·재연결만으로 재생하지 않는다. 수치·점수·콤보 갱신과 음성 안내 주기는 유지한다.

## 2026-11-05 추가 — 한국어 음성 CPR 코치

- 실습 코치 오른쪽 위의 `음성 코치 켜기` 버튼으로 한국어 음성 안내를 활성화한다. 기본은 꺼짐이며 사용자가 직접 켠다. 브라우저 SpeechSynthesis와 기기의 한국어 음성을 사용하고, 미지원/재생 오류를 화면에 표시한다. 음성 품질·지원은 기기에 따라 다르다.
- 기존 직전 완료 깊이·BPM과 `metricCue` 판정만 읽어 깊이/속도 교정·유지·연결 대기 안내를 재생한다. 0.8초 안정화 후 바뀐 안내는 최소 3.5초, 같은 교정은 8초, 칭찬/연결 대기는 15초 간격으로 재생한다. 연결 끊김 안내는 안정화 후 우선한다. 3초 이상 완료 기록이 없으면 유지 칭찬 대신 압박 재개를 안내한다.
- 발화가 겹쳐 쌓이지 않도록 제어하고 끄기·라운드 종료·화면 이탈 시 재생과 타이머를 정리한다. 개인정보는 음성으로 전달하지 않는다. 센서 측정·원본 데이터·점수·저장 로직 변경 없음.
- 프론트 111개 테스트·빌드·변경 파일 lint 통과. 브라우저 시연에서 켜기/끄기 표시와 재생 오류가 없는 상태를 확인했다. 실제 스피커 청취·실물 센서 연계는 사용 기기에서 확인이 필요하다.

- 후속 UI 조정: 코치 제목을 `실시간 CPR 코치`로 통일하고 코치 영역 왼쪽 위에 배치했다. 제목 크기는 데스크톱 18px, 모바일 14px로 확대했다.

## 2026-11-05 추가 — 밝은 중앙 피드백과 작은 하트

- 어두운 코치·점수 배경을 밝은 색상으로 교체했다. 피드백을 중앙에 크게 배치하고 콤보·획득 PT는 아래로 모았다. 코치 높이를 데스크톱 170~200px로 줄여 여백을 축소했다.
- 큰 박동 하트를 없애고, 기존 완료 이벤트마다 양옆에서 작은 하트가 세 개씩 떠올라 사라지는 효과를 적용했다. 모션 감소 설정은 위치 이동 없는 페이드로 대체한다.
- 측정·판정·채점 변경 없음. 프로덕션 빌드·변경 TSX lint 통과. 브라우저에서 밝은 배경, 중앙 피드백, 양옆 하트와 그래프 배치를 확인했다.

## 2026-11-05 추가 — 큰 측정 숫자와 하트 연출

- 깊이·속도 숫자를 데스크톱 최대 142px로 확대하고, 코치 팝업은 어두운 배경·큰 글자·고대비 색상으로 강조했다.
- 기존 완료 압박 이벤트마다 뛰는 분홍색 하트, 빛 번짐·파동·장식 입자를 추가했다. 배수 달성 시 보라색 하트로 강조한다. 하트는 교육용 장식이며 실제 심박 측정값이 아니다. 모션 감소 설정에서는 박동·파동을 생략한다.
- 측정·판정·채점 변경 없음. 빌드와 변경 TSX lint 통과. 브라우저 시연에서 큰 숫자·하트·콤보 표시 확인. 확대된 영역 아래 그래프와 참가자 카드가 겹치지 않도록 최소 높이를 확보했다.

## 2026-11-05 추가 — 압박별 게임 코치 효과

- 고정 실시간 CPR 코치 바를 `CompressionBurst.tsx`의 압박별 팝업으로 교체했다. 기존 완료 이벤트가 추가될 때마다 확대·상승·페이드 효과를 재생하고, 마지막 압박 이후 1초 뒤 사라진다. 센서 샘플 갱신이나 재연결만으로 재생하지 않는다.
- 정확 압박은 PERFECT·콤보·획득 PT, 5/10/20콤보는 LEVEL UP·배수 달성 효과를 표시한다. 교정 필요 시 같은 공간에 깊이/속도 안내를 표시하며, 속도 미확인은 준비 안내를 사용한다. 모션 감소 설정은 이동·확대 없이 페이드만 사용한다.
- 표시용 이벤트 수와 직전 완료 BPM을 기존 기록에서 읽도록 추가했다. 센서 측정·기존 점수·저장·랭킹 로직은 유지했다.
- 검증: 기존 프론트 108개 테스트 및 빌드 통과, 변경 파일 lint 통과. 브라우저 시연에서 7 COMBO/+40 PT와 속도 교정 팝업을 확인했다. 실제 하드웨어는 미검증.

## 2026-11-05 전시 실습 화면 피드백·콤보 강화

- `/participant?mode=live` 실습 화면에 깊이·속도별 행동 피드백, 큰 콤보 숫자, 배수·다음 목표 진행 표시를 추가했다. 깊이 안내는 기존 직전 완료 압박 최대 깊이, 속도 안내는 기존 표시 속도를 사용한다. 실시간 깊이 숫자는 기존 변위 그대로다.
- 화면용 보너스 PT: 기존 정확 판정 +20, 근접 +10. 정확한 압박 연속 5회부터 ×2, 10회부터 ×4, 20회부터 ×8(최대). 해당 정확 압박부터 배수 적용. 근접·미흡·속도미확인은 기존 콤보 규칙대로 초기화. 센서 오프라인 시 콤보/배수 표시 대신 연결 대기를 보여준다.
- 보너스 PT는 현재 브라우저 실습과 개별 결과에서만 표시한다. 서버 저장·전체 랭킹·등급은 기존 100점 정확도/XP 기준을 유지한다. 보너스 PT 영구 저장이나 전체 랭킹 반영은 이번 프론트 변경에 포함하지 않았다.
- 펌웨어, 백엔드, 센서 파싱·깊이/BPM 계산·압박 검출·라운드 수집·기존 채점/저장 프로토콜은 변경하지 않았다.
- 검증: 프론트 108개 테스트 통과, 프로덕션 빌드 통과, 변경 TS/TSX 파일 lint 통과. 전체 lint는 기존 `AdminScreen.tsx:161`의 빈 함수 오류 1개와 경고 15개로 실패. 브라우저 시연에서 피드백·점수·콤보 표시 확인, 모바일 안내 겹침을 보완했다. 실제 센서 검증은 미실시.


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
