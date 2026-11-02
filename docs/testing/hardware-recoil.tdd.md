# 깊이·속도·복귀율 연동 검증 (2026-10-28)

요구: 기존 하드웨어 보정표로 깊이와BPM을 실제 화면에 전달하고 변위 복귀율을 추가한다.

## RED → GREEN

- `npm test -- src/live/sensorState.test.ts src/live/readings.test.ts`: 이완 전달2테스트 실패(undefined/null), 구현 후통과.
- `python3 -m unittest test_backend_server`: 신규 이완 필드 보존 테스트KeyError, 검증중계 구현 후8개통과.
- 해제 프레임에서도 직전 압박 최대깊이로 피드백하는 테스트: 깊이0에서점수10/얕음 실패, 구현후통과. 현재깊이 자체는0표시 유지.
- 교육생/강사/게임 렌더: 실제값/대기/오프라인 신규테스트 RED확인후GREEN.
- C++검출 테스트: 전체복귀, 불완전복귀60%, timeout, 첫null, 7점중간값, 시작시눌린상태, 순간반등 중복검출 방지.

## 검증 결과

- 프론트 `npm test`:82/82통과. `npm run test:coverage`: 현재설정 포함파일 lines97.73%,branches86.88%,functions86.04%; 전체코드보장아님.
- `npm run build`:성공. `npm run lint`:오류0,경고12.
- `npx tsc --noEmit`:기존 미사용React import/Vite타입/GradeBadge/nullable시연값 등 오류남음. Vite빌드통과와 구분.
- 백엔드 unittest8개통과.
- 실제 ESP32컴파일: `arduino-cli compile --fqbn esp32:esp32:esp32 --build-path /tmp/lifepulse-build-final firmware/lifepulse_esp32` 성공(core3.3.11,flash84%,RAM15%).
- 로컬서버+브라우저에 센서형식 테스트 JSON전달: 교육생화면 깊이5.4cm,110BPM,복귀율82.0% 확인. 연결대기 상태에서0/0/—확인. 이값은 테스트 데이터이며 실제기구 검증결과가 아님.
- 물리적장치업로드, 기준장비와정확도대조, NVS재부팅실물시험은미수행.

커밋은 하지 않았고 기존 미커밋 변경을 보존했다.

## 자체 검토

| 항목 | 점수 | 근거 및 한계 |
|---|---|---|
| 정확성 |4/5|컴파일·소프트웨어 테스트·브라우저연동 확인; 실제 기구 대조 미수행|
| 완결성 |4/5|펌웨어→서버→3개화면 반영; 업로드/물리측정은 사용환경에서 필요|
| 명확성 |4/5|복귀율의 변위 정의와 null/오프라인 표시 명시; 기존 타입오류 별도 존재|
| 실행가능성 |4/5|코드ZIP·동작서버·보정절차 제공; 장치 Wi-Fi와 IP 확인 필요|
| 간결성 |4/5|기존프로토콜 확장; 레거시두점helper는 기존테스트호환을 위해 보존|
