# 팀 순환 실습 및 게임 점수 검증

요구: 1~4인 선택, 각120초 순차실습/교대/최종점수, 스크롤없는 전체단계.

## RED/GREEN

- 점수함수 미구현 RED(teamGameStats is not a function) → 정확+2/근접+1, 콤보,100점환산,등급 구현후GREEN.
- 라이브 점수UI RED(100점/XP/콤보 없음) → 게임바 구현후GREEN.
- 교대후 첫 압박에 이전사람 BPM이 연결되는 RED(expected110 to be null) → 라운드첫속도 제외후GREEN.
- 백엔드 캐시 freshness RED(AttributeError) → 최근1초/활성연결 가드후9테스트GREEN.

## 보장

| 기능 | 증거 |
|---|---|
| 1~4인 순차, 타임아웃,1회저장 | teamSession.test.ts |
| 교대카운터 분리/누락기록비복제/재부팅기준 | teamSession.test.ts |
| 점수/콤보/등급/동점순위/미측정 | teamSession.test.ts, TeamPracticeScreen.test.tsx |
| 실제센서 값 없는 경우 측정대기 | TeamPracticeScreen.test.tsx |
| viewport실습 스크롤 없음 | 1366×768,1280×720,1024×768,390×844 브라우저DOM scrollHeight=innerHeight/scrollWidth=innerWidth |
| 교대화면 스크롤 없음 | 390×844 DOM동일 |

`npm run test:coverage`:101개통과. 현재설정 포함파일 lines98.04%,branches85.56%,functions82.53%; hook/App전체coverage보장이아님.
`npm run lint`:0errors,12existingwarnings. `npm run build`:통과.
실제센서 하드웨어 대조는 수행하지 않음. 브라우저동작검증은 명시된 시연모드로 진행.
백엔드재시작은 자동승인검토의 계정사용량제한으로 차단; 우회실행하지 않음.

## 브라우저 추가 확인

시연모드4인에서 실제120초를 기다린 뒤 자동으로2번 참가자 교대 화면이 나타남을 확인했다. 다음사람 시작 시 카운터/점수0, 타이머2분으로 초기화됨을 확인했다. 시간가속이나테스트용라운드길이를프로덕션에추가하지 않았다.

## 자체 검토

정확성4/5:모델/SSR/브라우저동작검증, 실물센서대조는미수행. 완결성4/5:모든화면/채점반영, 백엔드재실행은승인검토실패로미완료. 명확성4/5:XP/100점환산/등급/복귀율참고범위명시, 작은화면그래프는탭전환. 실행가능성4/5:프론트실행중, 백엔드는사용자터미널실행필요. 간결성4/5:기존라우트/센서프로토콜활용, 이전화면은호환목적으로보존.

4인 전체결과 브라우저확인: 1번은실제120초자동종료,2~4번은수동조기종료를이용해순서/결과전환을검증했다. 네개별점수/등급/XP/최대콤보/동점순위정책확인. 1280×720,390×844 결과화면 scrollHeight=innerHeight. 모바일결과카드4개 각각scrollHeight=clientHeight=278px, 마지막footer하단832px<844px로내용잘림없음. 미리보기output/team-practice-preview.png,team-results-preview.png는시연데이터이며성능증거가아니다.
