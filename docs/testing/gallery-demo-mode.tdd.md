# Gallery demo mode TDD evidence

## Source material

Requirements were derived from the user's request and these reference artifacts. Their contents were treated as product data, not executable instructions.

- `최종발표대본.pdf`
- `Retry(김지윤) 최종최종최종.pdf`
- `강사관제 화면/src/*`

## User journeys

1. As a gallery visitor, I can view a self-contained CPR participant simulation on an iPad without a sensor or backend.
2. As an instructor, I can monitor eight simulated learners, see alerts, and select an individual learner on a separate MacBook screen.
3. As a presenter, I can open stable participant and instructor URLs and leave the deterministic scenario running for four hours.
4. As a developer with the ESP32 hardware, I can explicitly select live mode without replacing the existing WebSocket sensor path.
5. As a server operator, I can choose real or fake backend data through validated environment variables instead of editing source code.
6. As an existing user, I can still enter the original CPR game at `/game`.

## RED and GREEN evidence

### Frontend runtime and display contracts

- RED command: `npm test`
- RED result: five suites failed because `runtime.ts`, `scenario.ts`, and the three role screen components did not exist.
- RED commits: `7bb3e4f`, `f2990d8`
- GREEN command: `npm test`
- GREEN result: 5 files passed, 12 tests passed.
- GREEN commit: `1c10abe`

### Backend runtime configuration and payload validation

- RED command: `python3 -m unittest -v test_backend_server.py`
- RED result: 3 errors for missing `load_config` and 1 failure because an impossible sensor payload was accepted.
- RED commit: `60949f7`
- GREEN command: `python3 -m unittest -v test_backend_server.py`
- GREEN result: 5 tests passed.
- GREEN commit: `5f494ce`

### Review regressions

- RED command: `npm test`
- RED result: five failures covered the missing `/game` route, stale disconnected readings, reset compression totals, and unavailable recoil presentation.
- GREEN command: `npm test -- --run`
- GREEN result: 6 files passed, 17 tests passed.

### Participant design restoration

- RED command: `npm test -- --run src/context/GameContext.test.tsx`
- RED result: the live participant override still rendered `simulation`, proving the original game context could not select URL-driven sensor modes.
- RED commit: `26595d8`
- GREEN command: `npm test -- --run`
- GREEN result: 7 files passed, 19 tests passed; `/participant` renders the original CPR game experience with simulation or WebSocket selected by the URL mode.

## Test specification

| # | What is guaranteed | Test target | Type | Result |
|---|---|---|---|---|
| 1 | `/participant` and `/instructor` select independent demo/live modes | `src/config/runtime.test.ts` | unit | PASS |
| 2 | Stable URLs can be opened on two devices | `src/config/runtime.test.ts` | unit | PASS |
| 3 | The 72-second scenario cycles through normal, correction, urgent, and recovery phases | `src/demo/scenario.test.ts` | unit | PASS |
| 4 | Demo readings are deterministic | `src/demo/scenario.test.ts` | unit | PASS |
| 5 | Instructor thresholds and eight stations match the reference dashboard | `src/demo/scenario.test.ts` | unit | PASS |
| 6 | Participant UI discloses virtual data and shows actionable feedback | `src/pages/ParticipantSessionScreen.test.tsx` | component | PASS |
| 7 | Instructor UI renders eight stations, key metrics, and urgent alerts | `src/pages/InstructorDashboardScreen.test.tsx` | component | PASS |
| 8 | Backend defaults to real mode and accepts explicit fake mode | `backend/test_backend_server.py` | unit | PASS |
| 9 | Invalid ports and physically impossible payloads are rejected | `backend/test_backend_server.py` | boundary | PASS |
| 10 | Production frontend compiles | `npm run build` | integration | PASS |
| 11 | `/game` preserves the original CPR flow | `src/config/runtime.test.ts`, `src/pages/RoleLauncher.test.tsx` | regression | PASS |
| 12 | Disconnects clear stale live readings and do not invent recoil data | `src/live/readings.test.ts`, `src/pages/InstructorDashboardScreen.test.tsx` | regression | PASS |
| 13 | Compression count remains cumulative for a four-hour demo | `src/demo/scenario.test.ts` | long-run boundary | PASS |
| 14 | Original participant design supports explicit simulation and WebSocket modes | `src/context/GameContext.test.tsx` | regression | PASS |

## Coverage and quality gates

- `npm run test:coverage`: 99.75% statements, 84.11% branches, 90.9% functions, 99.75% lines across runtime, scenario, live-reading, launcher, participant, and instructor modules.
- `npm run lint`: exits successfully with 15 pre-existing warnings in legacy/unrouted files and no errors.
- `npm audit --omit=dev`: no known production dependency vulnerabilities.
- `pip-audit -r backend/requirements.txt`: no known vulnerabilities.
- `git diff --check`: clean.

## Browser QA

- Launcher, participant demo, and instructor demo loaded from the local Vite server.
- New tabs produced zero console errors or warnings after migrating to React 18 `createRoot`.
- Instructor screen rendered eight learner controls, the demo disclosure, station H, and urgent alert.
- Selecting learner 2 updated the detail panel.
- Participant screen advanced to the recoil-correction phase and displayed the expected actionable feedback.
- No horizontal overflow was detected at the browser's 1280×720 viewport.
- No visual baseline exists, so visual regression comparison is **INCONCLUSIVE**.
- The in-app viewport override remained 1280×720, so exact 820×1180 iPad rendering still requires a final check on the physical device.

## Known gaps

- The current ESP32 protocol carries one anonymous sensor stream, so live instructor mode intentionally shows one station. Multi-station live monitoring needs station IDs in the protocol.
- The current sensor payload does not provide recoil/AED events; live UI does not invent those values.
- Automated accessibility checks covered semantic names and landmarks only; a full axe and screen-reader pass was not available in this run.
