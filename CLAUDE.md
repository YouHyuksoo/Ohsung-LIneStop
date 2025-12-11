# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**Ghost Eclipse** - 스마트 팩토리 불량 모니터링 시스템
실시간으로 제조 라인의 불량을 감지하고, 임계값 초과 시 자동으로 라인을 정지시키는 시스템입니다.

**기술 스택**: Next.js 15 Full-Stack (Frontend + API Routes)

## 빌드 및 실행 명령어

### 개발 서버 실행

```bash
cd frontend
npm install
npm run dev
```

→ `http://localhost:3003` 에서 실행됩니다.

### 프로덕션 빌드

```bash
cd frontend
npm run build
npm start
```

### Lint 실행

```bash
npm run lint
```

## 아키텍처 구조

### Full-Stack Next.js 구조

이 프로젝트는 **Next.js 15 App Router**를 사용한 풀스택 애플리케이션입니다.

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # 메인 랜딩 페이지 (리뉴얼)
│   │   ├── monitor/page.tsx   # 실시간 모니터링 페이지
│   │   ├── admin/page.tsx     # 관리자 페이지
│   │   ├── defects/page.tsx   # 불량 이력 페이지
│   │   ├── settings/page.tsx  # ⭐ NEW: 시스템 설정 페이지
│   │   ├── logs/page.tsx      # ⭐ NEW: 시스템 로그 페이지
│   │   ├── help/page.tsx      # ⭐ NEW: 도움말 페이지
│   │   └── api/               # Backend API Routes
│   │       ├── status/route.ts           # GET /api/status
│   │       ├── resolve/route.ts          # POST /api/resolve
│   │       ├── defects/route.ts          # GET /api/defects
│   │       ├── logs/route.ts             # ⭐ NEW: GET/DELETE /api/logs
│   │       ├── settings/route.ts         # ⭐ NEW: GET/POST /api/settings
│   │       ├── admin/
│   │       │   ├── control/route.ts      # POST /api/admin/control
│   │       │   └── rules/
│   │       │       ├── route.ts          # GET/POST /api/admin/rules
│   │       │       └── [code]/route.ts   # DELETE /api/admin/rules/{code}
│   │       └── init/route.ts             # 서버 초기화
│   └── lib/
│       ├── types.ts                      # TypeScript 타입 정의
│       ├── utils.ts                      # 유틸리티 함수
│       └── services/                     # Backend 서비스 로직
│           ├── monitor.ts                # 모니터링 서비스 (Logger 통합)
│           ├── plc.ts                    # PLC 통신 (Logger 통합)
│           ├── db.ts                     # 데이터베이스 (Logger 통합)
│           └── logger.ts                 # ⭐ NEW: 중앙 집중식 로그 시스템
├── defect_rules.json                     # 불량 규칙 영구 저장
└── settings.json                         # ⭐ NEW: 시스템 설정 저장
```

**중요한 설계 결정:**
- **풀스택 구조**: 별도의 백엔드 서버 없이 Next.js API Routes 사용
- **서비스 레이어**: `lib/services/`에 비즈니스 로직 분리
- **윈도우 정책**: 첫 불량 발생 시 1시간 윈도우 시작, 시간 만료 시에만 리셋
- **라인 정지 후 동작**: 라인 재가동 시 윈도우는 리셋되지 않음 (재발 방지 목적)
- **Mock 모드**: PLC와 DB 없이도 테스트 가능하도록 설계
- **중앙 집중식 로그**: 모든 컴포넌트의 로그를 하나의 시스템으로 관리

### Frontend 아키텍처

**주요 페이지:**
- `/` - 메인 랜딩 (6개 메뉴 카드, 아키텍처 시각화)
- `/monitor` - 실시간 모니터링 대시보드
- `/admin` - 관리자 페이지 (규칙 관리, 서비스 제어)
- `/defects` - 불량 이력 페이지
- `/settings` - ⭐ 시스템 설정 (폴링, Mock 모드, 윈도우, 알림)
- `/logs` - ⭐ 시스템 로그 (실시간, 필터링, 검색)
- `/help` - ⭐ 도움말 (가이드, FAQ, Troubleshooting)

**주요 패턴:**
- **실시간 폴링**: `setInterval`로 1초마다 상태 업데이트
- **Client Components**: 모든 페이지가 `'use client'` 사용 (상태 관리 필요)
- **API 통신**: 상대 경로(`/api/*`)로 자체 API Routes 호출
- **시각적 피드백**: 색상, 애니메이션으로 상태 표시

## 핵심 비즈니스 로직

### 1. 윈도우 기반 불량 집계

**위치**: `src/lib/services/monitor.ts` - `handleDefect()` 메서드

```typescript
// 윈도우가 비활성 상태면 새로 시작
if (!this.isWindowActive()) {
  this.windowStartTime = now;
  this.windowEndTime = new Date(now.getTime() + 60 * 60 * 1000); // 1시간 후
  this.currentCounts = {};
  this.windowDefects = [];
  logger.log('INFO', 'Monitor', `새 윈도우 시작 (불량 코드: ${defect.code})`);
}

// 윈도우에 불량 추가
this.windowDefects.push(defect);
this.currentCounts[defect.code] = (this.currentCounts[defect.code] || 0) + 1;
```

**동작 원리:**
- 첫 불량 발생 시 1시간 윈도우 시작
- 윈도우 내에서 불량 코드별로 카운트 누적
- 시간 만료 시에만 윈도우 리셋 (`resetWindow()`)
- 라인 재가동 시에는 윈도우 유지 (재발 방지)
- 모든 주요 이벤트는 Logger에 기록

### 2. 자동 라인 정지

**위치**: `src/lib/services/monitor.ts` - `handleDefect()` 메서드

```typescript
// 임계값 체크
if (count >= rule.threshold) {
  if (plc.readStatus() === 'RUNNING') {
    const reason = `${rule.name} (${defect.code}) ${count}회 발생 (기준 ${rule.threshold}회)`;
    logger.log('WARN', 'Monitor', `임계값 초과! ${reason}`);
    plc.stopLine(reason);
  }
}
```

**위치**: `src/lib/services/plc.ts` - `stopLine()` 메서드

```typescript
stopLine(reason: string): void {
  console.log(`[PLC] !!! STOP LINE COMMAND SENT !!! Reason: ${reason}`);
  logger.log('ERROR', 'PLC', `🚨 라인 정지 명령 전송! 사유: ${reason}`);
  this.isStopped = true;
  this._stopReason = reason;
  // TODO: 실제 PLC에 정지 신호 전송
}
```

### 3. 규칙 관리

**위치**: `src/lib/services/db.ts`

- 규칙은 `defect_rules.json` 파일에 영구 저장
- 불량 코드, 이름, 임계값, 활성화 상태 관리
- 파일 없으면 빈 상태로 시작
- 규칙 추가/삭제/조회 시 Logger에 기록

### 4. 로그 시스템 (⭐ NEW)

**위치**: `src/lib/services/logger.ts`

```typescript
class Logger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000; // 최대 저장 로그 수

  log(level: LogLevel, component: LogComponent, message: string, data?: any): void {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      level,
      component,
      message,
      data,
      timestamp: new Date(),
    };
    this.logs.unshift(entry); // 최신 로그를 앞에 추가
  }

  getFilteredLogs(filters: {
    level?: LogLevel;
    component?: LogComponent;
    search?: string;
    limit?: number;
  }): LogEntry[] {
    // 필터링 로직
  }
}
```

**특징:**
- **4가지 로그 레벨**: INFO, WARN, ERROR, DEBUG
- **6가지 컴포넌트**: Monitor, PLC, DB, API, System, Admin
- **메모리 기반 저장**: 최대 1000개 로그
- **필터링 및 검색**: 레벨, 컴포넌트, 검색어로 필터
- **실시간 조회**: `/api/logs` API를 통해 조회

## Mock 모드 설정

### PLC Mock 모드 활성화/비활성화

**파일**: `src/lib/services/plc.ts`

```typescript
class PLC {
  private mockMode: boolean = true;  // True: Mock 모드, False: 실제 PLC 연결
}
```

### DB Mock 모드 활성화/비활성화

**파일**: `src/lib/services/db.ts`

```typescript
class Database {
  private mockMode: boolean = true;  // True: Mock 데이터, False: 실제 Oracle DB
}
```

**Mock DB 동작:**
- `fetchRecentDefects()`에서 10% 확률로 랜덤 불량 생성
- 테스트용으로 실제 DB 없이 불량 발생 시뮬레이션 가능
- Mock 불량 생성 시 Logger에 DEBUG 레벨로 기록

### UI를 통한 Mock 모드 설정 (⭐ NEW)

`/settings` 페이지에서 다음 항목들을 조정할 수 있습니다:
- **PLC Mock 모드**: ON/OFF 토글
- **DB Mock 모드**: ON/OFF 토글
- 설정은 `settings.json` 파일에 영구 저장

## API 엔드포인트

**베이스 URL**: 상대 경로 `/api` (자체 서버)

| Method | Endpoint | 설명 | Request Body | Response |
|--------|----------|------|--------------|----------|
| GET | `/api/status` | 현재 상태 조회 | - | 라인 상태, 윈도우 정보, 카운트 |
| POST | `/api/admin/control` | 서비스 시작/정지 | `{"action": "start" \| "stop"}` | 상태 메시지 |
| POST | `/api/resolve` | 라인 정지 해제 | `{"reason": "string"}` | 성공 메시지 |
| GET | `/api/admin/rules` | 규칙 조회 | - | 규칙 리스트 |
| POST | `/api/admin/rules` | 규칙 추가 | `DefectRule` | 추가된 규칙 |
| DELETE | `/api/admin/rules/{code}` | 규칙 삭제 | - | 성공 메시지 |
| GET | `/api/defects` | 불량 이력 조회 | - | 불량 리스트 |
| **GET** | **`/api/logs`** | **⭐ 로그 조회** | **Query: level, component, search, limit** | **로그 리스트** |
| **DELETE** | **`/api/logs`** | **⭐ 로그 삭제** | **-** | **성공 메시지** |
| **GET** | **`/api/settings`** | **⭐ 설정 조회** | **-** | **현재 설정** |
| **POST** | **`/api/settings`** | **⭐ 설정 저장** | **설정 객체** | **저장된 설정** |
| GET | `/api/init` | 서버 초기화 | - | 초기화 상태 |

### ⭐ NEW API 상세 설명

#### GET /api/logs

**쿼리 파라미터:**
- `level` (optional): 로그 레벨 필터 (INFO, WARN, ERROR, DEBUG)
- `component` (optional): 컴포넌트 필터 (Monitor, PLC, DB, API, System, Admin)
- `search` (optional): 검색어 (메시지 내용 검색)
- `limit` (optional): 반환할 로그 개수 (기본: 100)

**사용 예시:**
```
GET /api/logs
GET /api/logs?level=ERROR
GET /api/logs?component=Monitor&search=불량
GET /api/logs?level=WARN&limit=50
```

#### POST /api/settings

**Request Body:**
```json
{
  "polling": {
    "interval": 2  // 1-10초
  },
  "mock": {
    "plc": true,
    "db": true
  },
  "window": {
    "duration": 1  // 1-24시간
  },
  "notification": {
    "browser": true,
    "sound": true
  }
}
```

## 주석 및 코딩 규칙

**모든 파일은 JSDoc 형식의 한국어 주석 포함:**

```typescript
/**
 * @file 파일경로
 * @description
 * 파일의 목적 및 기능 설명
 *
 * 주요 기능:
 * 1. ...
 * 2. ...
 *
 * 동작 원리:
 * - ...
 *
 * 주의사항:
 * - ...
 */
```

**새 파일 생성 시 반드시 포함할 것:**
- 파일의 목적과 기능
- 사용법
- 유지보수 방법
- 초보자를 위한 가이드

## 주요 의존성

**Core:**
- `next`: Next.js 15 (App Router + API Routes)
- `react`: React 18
- `typescript`: TypeScript 5

**UI:**
- `tailwindcss`: 스타일링
- `lucide-react`: 아이콘
- `framer-motion`: 애니메이션
- `class-variance-authority`: 조건부 스타일링

**Utilities:**
- `axios`: HTTP 클라이언트
- `date-fns`: 날짜 포맷팅
- `clsx`, `tailwind-merge`: 클래스 병합

## 일반적인 개발 작업

### 새 API 추가

1. `src/app/api/` 하위에 폴더 및 `route.ts` 생성
2. GET/POST/DELETE 등 HTTP 메서드에 해당하는 함수 export
3. `src/lib/services/`의 서비스 로직 호출
4. **Logger 통합**: 주요 작업 시 `logger.log()` 호출
5. 프론트엔드에서 `/api/새경로` 호출

### 서비스 로직 수정

1. **모니터링 로직**: `src/lib/services/monitor.ts` 수정
2. **PLC 통신**: `src/lib/services/plc.ts` 수정
3. **DB 로직**: `src/lib/services/db.ts` 수정
4. **Logger 통합**: 주요 이벤트 발생 시 `logger.log()` 호출

### UI 수정

1. **새 페이지 추가**: `src/app/` 하위에 폴더 생성 후 `page.tsx` 추가
2. **UI 컴포넌트 추가**: 각 페이지 파일 내에서 컴포넌트 정의
3. **API 호출 추가**: `axios`로 자체 API Routes 호출
4. **스타일 수정**: Tailwind CSS 클래스 사용

### Logger 사용 방법 (⭐ NEW)

```typescript
import { logger } from '@/lib/services/logger';

// INFO 레벨 로그
logger.log('INFO', 'Monitor', '모니터링 서비스가 시작되었습니다.');

// WARN 레벨 로그
logger.log('WARN', 'Monitor', `임계값 초과! ${reason}`);

// ERROR 레벨 로그
logger.log('ERROR', 'PLC', `라인 정지 명령 전송! 사유: ${reason}`);

// DEBUG 레벨 로그
logger.log('DEBUG', 'DB', `Mock 불량 생성: ${code} - ${name}`);

// 추가 데이터 포함
logger.log('INFO', 'API', '규칙 추가됨', { code, name, threshold });
```

### 테스트 방법

1. `npm run dev`로 개발 서버 시작 (자동으로 모니터링 서비스 시작)
2. **Settings 페이지**에서 Mock 모드, 폴링 주기 등 설정
3. **Admin 페이지**에서 규칙 추가
4. **Monitor 페이지**에서 실시간 상태 확인
5. **Logs 페이지**에서 시스템 로그 확인
6. Mock DB가 10% 확률로 불량 생성하므로 대기
7. 임계값 초과 시 라인 정지 확인
8. "조치 확인 및 재가동" 버튼으로 라인 재가동
9. **Logs 페이지**에서 전체 이벤트 흐름 확인

## 모니터링 서비스 자동 시작

**파일**: `src/app/api/init/route.ts`

서버 시작 시 자동으로 모니터링 서비스가 시작됩니다.
수동으로 제어하려면 Admin 페이지에서 Start/Stop 버튼 사용.

## 환경 변수 설정

**.env.local** 파일을 프로젝트 루트에 생성하세요 (옵션):

```bash
# PLC 통신 설정
NEXT_PUBLIC_PLC_HOST=192.168.1.100
NEXT_PUBLIC_PLC_PORT=102

# DB 설정
NEXT_PUBLIC_DB_HOST=oracle.example.com
NEXT_PUBLIC_DB_PORT=1521
NEXT_PUBLIC_DB_SID=ORCL
```

**주의**: `NEXT_PUBLIC_*` 접두사는 클라이언트에서 접근 가능한 변수입니다. 민감한 정보는 접두사 없이 서버 전용으로 저장하세요.

## 린트 및 코드 스타일

**Lint 실행:**
```bash
npm run lint
```

## 주요 의존성 추가 설명

**새로 추가된 의존성:**
- `better-sqlite3`: 로컬 파일 기반 DB (현재 Mock DB에서 사용 가능)
- `mcprotocol`: Siemens S7 PLC 통신 라이브러리
- `oracledb`: Oracle DB 드라이버 (향후 실제 DB 연결용)
- `zustand`: 경량 상태 관리 라이브러리
- `@tanstack/react-table`: 테이블 컴포넌트 라이브러리

## 주요 파일 설명

| 파일 | 설명 | 수정 빈도 |
|------|------|---------|
| `src/lib/services/monitor.ts` | 핵심 모니터링 로직 (윈도우, 임계값) | 높음 |
| `src/lib/services/plc.ts` | PLC 통신 (실제/Mock) | 중간 |
| `src/lib/services/db.ts` | DB 규칙 관리 | 중간 |
| `src/lib/services/logger.ts` | 중앙 로깅 시스템 | 낮음 |
| `src/lib/types.ts` | TypeScript 타입 정의 | 중간 |
| `defect_rules.json` | 불량 규칙 데이터 | 높음 |
| `settings.json` | 시스템 설정 데이터 | 높음 |

## 중요 노트

### Next.js 15 변경사항

**Dynamic Route Params가 Promise로 변경됨:**

```typescript
// ❌ 잘못된 방법 (Next.js 14 이하)
export async function DELETE(request: NextRequest, { params }: { params: { code: string } }) {
  const { code } = params;
}

// ✅ 올바른 방법 (Next.js 15)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;  // await 필수!
}
```

### Logger 메서드 접근성

Logger의 `log()` 메서드는 **public**으로 설정되어 있어 다른 서비스에서 직접 호출 가능:

```typescript
// logger.ts
class Logger {
  log(level: LogLevel, component: LogComponent, message: string, data?: any): void {
    // 공개 메서드
  }
}
```

### 메모리 관리

- Logger는 최대 1000개의 로그만 메모리에 저장
- 초과 시 오래된 로그 자동 삭제
- 필요시 로그 다운로드 기능 추가 권장

## 일반적인 문제 해결

### 포트 3003이 이미 사용 중인 경우

```bash
# 포트 확인
netstat -ano | findstr :3003

# 다른 포트로 실행
npm run dev -- -p 3004
```

### 모니터링 서비스가 시작되지 않는 경우

1. 브라우저 콘솔(F12)에서 에러 확인
2. `/api/init` 엔드포인트 호출 확인
3. `src/app/api/init/route.ts`에서 로그 확인

### Mock 데이터 리셋

`src/lib/services/db.ts`의 `fetchRecentDefects()` 메서드에서 Mock 데이터 생성:
- DB Mock 모드 ON 상태에서 10% 확률로 불량 발생
- `/settings`에서 Mock 모드 토글로 제어 가능

## 향후 개선 사항

**단기:**
- 실제 PLC/DB 연결 구현
- WebSocket 기반 실시간 로그 스트리밍
- 환경 변수 관리 개선

**중기:**
- 로그 파일 다운로드
- 차트 및 통계 대시보드
- 알림 시스템 (브라우저/소리)

**장기:**
- 다국어 지원 (i18n)
- 모바일 앱
- AI 기반 불량 예측
- 외부 시스템 연동 (ERP, MES)