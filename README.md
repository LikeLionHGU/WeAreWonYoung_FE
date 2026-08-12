# Creator Risk Manager

유튜브 게시 전 영상의 발언과 자막에서 검토가 필요한 구간을 찾는 MVP 프런트엔드와 계약형 Mock API 서버입니다.

## 실행

```bash
npm install
npm run dev
```

Vite 앱은 `http://localhost:5173`, Mock API는 `http://localhost:3001`에서 실행됩니다. `npm run dev`는 두 서버를 함께 시작하고, `/api`와 `/ws`는 Vite proxy를 통해 Mock 서버로 전달합니다.

분석 속도는 `MOCK_STEP_MS`로 조정할 수 있습니다.

```bash
MOCK_STEP_MS=300 npm run dev
```

첫 분석을 실패시키고 재시도 흐름을 확인하려면 다음과 같이 실행합니다.

```bash
MOCK_FAIL_FIRST_JOB=true npm run dev
```

Mock 업로드 파일과 상태는 `mock-data/`에 저장되며 Git에는 포함되지 않습니다.

## 실제 백엔드로 전환

프런트 코드를 변경하지 않고 환경변수만 지정합니다.

```bash
VITE_API_BASE_URL=https://api.example.com \
VITE_WS_URL=wss://api.example.com/ws \
npm run dev
```

실제 서버는 명세의 `/api/v1` REST와 STOMP `/ws` 계약을 유지해야 합니다. Spring ↔ Python 내부 API와 AI 분석 파이프라인은 Mock 서버 범위에 포함하지 않습니다.

## 검증

```bash
npm run typecheck
npm run typecheck:server
npm run test:contract
npm run build
```
