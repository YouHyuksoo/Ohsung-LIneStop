# Ghost Eclipse - 스마트 팩토리 불량 모니터링 시스템

실시간으로 제조 라인의 불량을 감지하고 자동으로 라인을 정지시키는 지능형 모니터링 시스템입니다.

## 📋 목차

- [프로젝트 개요](#프로젝트-개요)
- [주요 기능](#주요-기능)
- [시작하기](#시작하기)
- [프로젝트 구조](#프로젝트-구조)
- [페이지 구성](#페이지-구성)
- [API 엔드포인트](#api-엔드포인트)
- [기술 스택](#기술-스택)
- [핵심 비즈니스 로직](#핵심-비즈니스-로직)
- [설정 파일 구조](#설정-파일-구조)
- [유틸리티 스크립트](#유틸리티-스크립트)
- [향후 개선 사항](#향후-개선-사항)

## 🎯 프로젝트 개요

**Ghost Eclipse**는 제조 라인의 불량을 실시간으로 모니터링하고, 설정된 임계값을 초과하면 자동으로 라인을 정지시켜 대량 불량을 방지하는 스마트 팩토리 솔루션입니다.

### 핵심 특징

- **윈도우 기반 집계**: 첫 불량 발생 시 설정된 시간(기본 1시간) 윈도우를 시작하여 불량 패턴 분석
- **불량 타입 시스템**: 외관불량(APPEARANCE), 기능불량(FUNCTION), 상식이하(COMMON_SENSE) 등 타입별 분류
- **자동 라인 정지**: 임계값 초과 시 PLC에 정지 신호를 전송하여 즉시 대응
- **실시간 로그 시스템**: 모든 시스템 이벤트를 추적하고 검색 가능
- **직관적인 설정**: UI를 통해 모니터링 주기, Mock 모드, 알림 등을 손쉽게 설정
- **통합 도움말**: 시스템 사용법과 문제 해결 가이드 제공

## ✨ 주요 기능

### 1. 📊 실시간 모니터링

- **1초 간격** 상태 업데이트
- 라인 상태 실시간 표시 (RUNNING/STOPPED)
- 윈도우 진행 상황 시각화 (시작 시간, 종료 시간, 남은 시간)
- 불량 코드별 카운트 실시간 추적
- 색상 및 애니메이션을 통한 시각적 피드백

### 2. 🎯 윈도우 기반 불량 집계

- 첫 불량 발생 시 **설정된 시간 윈도우** 자동 시작 (기본 1시간, 최대 24시간)
- 윈도우 내 불량 코드별 **누적 카운팅**
- 윈도우 만료 시 자동 리셋
- **라인 재가동 시 윈도우 리셋** (새로운 생산 사이클 시작)
- 윈도우 활성 상태 실시간 표시

### 3. 🚨 자동 라인 정지

- 불량 코드별 임계값 설정
- 불량 타입별 분류 (APPEARANCE, FUNCTION, COMMON_SENSE)
- 임계값 초과 시 **PLC에 정지 신호** 자동 전송
- 정지 사유 상세 기록 (불량 코드, 타입, 발생 횟수, 임계값)
- 전체 화면 경고 알림

### 4. ⚙️ 규칙 기반 모니터링

- 불량 코드, 이름, 타입, 임계값 관리
- 규칙별 활성/비활성 토글
- JSON 파일로 영구 저장 (`defect_rules.json`)
- 실시간 규칙 추가/수정/삭제
- 규칙 생성 시간 자동 기록

### 5. 📝 통합 로그 시스템

- **4가지 로그 레벨**: INFO, WARN, ERROR, DEBUG
- **6가지 컴포넌트**: Monitor, PLC, DB, API, System, Admin
- 레벨 및 컴포넌트별 필터링
- 검색 기능으로 특정 이벤트 추적
- 실시간 로그 스트리밍 (1초 폴링)
- 메모리 기반 저장 (최대 1000개)

### 6. 🛠️ 시스템 설정

- 모니터링 폴링 주기 조정 (1-10초, 기본 5초)
- PLC/DB Mock 모드 전환
- 윈도우 시간 설정 (1-24시간, 기본 1시간)
- 브라우저/소리 알림 설정
- PLC 연결 정보 (IP, Port, Address)
- DB 연결 정보 (Host, Port, Service, User)

### 7. 📖 통합 도움말

- 시스템 개요 및 아키텍처
- 빠른 시작 가이드 (4단계)
- 주요 기능 사용법
- 문제 해결 (Troubleshooting)
- 자주 묻는 질문 (FAQ)

## 🚀 시작하기

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

### 포트 충돌 해결

3003 포트가 이미 사용 중인 경우:

**Windows 배치 파일:**

```bash
kill-port-3003.bat
```

**PowerShell 스크립트:**

```powershell
.\kill-port-3003.ps1
```

## 📁 프로젝트 구조

```
OhSung-LineStop/
├── README.md                          # 프로젝트 개요 (이 파일)
├── CLAUDE.md                          # 개발 가이드 (Claude Code용)
├── PROJECT_COMPLETE.md                # 프로젝트 완료 보고서
├── kill-port-3003.bat                 # 포트 3003 종료 스크립트 (배치)
├── kill-port-3003.ps1                 # 포트 3003 종료 스크립트 (PowerShell)
└── frontend/                          # Next.js 15 Full-Stack 애플리케이션
    ├── src/
    │   ├── app/                       # Next.js App Router
    │   │   ├── page.tsx              # 🏠 메인 랜딩 페이지
    │   │   ├── monitor/              # 📊 실시간 모니터링
    │   │   ├── defects/              # 📋 불량 이력
    │   │   ├── admin/                # 👤 관리자 (규칙 관리)
    │   │   ├── settings/             # ⚙️ 시스템 설정
    │   │   ├── logs/                 # 📝 시스템 로그
    │   │   ├── help/                 # 📖 도움말
    │   │   └── api/                  # Backend API Routes
    │   │       ├── init/             # 초기화
    │   │       ├── status/           # 상태 조회
    │   │       ├── resolve/          # 라인 해제
    │   │       ├── defects/          # 불량 이력
    │   │       ├── logs/             # 로그 조회/삭제
    │   │       ├── settings/         # 설정 조회/저장
    │   │       └── admin/            # 관리 기능
    │   │           ├── control/      # 서비스 제어
    │   │           └── rules/        # 규칙 관리 (CRUD)
    │   ├── components/
    │   │   └── BackButton.tsx        # 뒤로가기 버튼 컴포넌트
    │   └── lib/
    │       ├── types.ts              # TypeScript 타입 정의
    │       ├── utils.ts              # 유틸리티 함수
    │       └── services/             # Backend 서비스 로직
    │           ├── monitor.ts        # 모니터링 서비스 (핵심 로직)
    │           ├── plc.ts            # PLC 통신
    │           ├── db.ts             # 데이터베이스
    │           ├── logger.ts         # 로그 시스템
    │           └── state.ts          # 전역 상태 관리
    ├── defect_rules.json             # 불량 규칙 영구 저장
    ├── settings.json                 # 시스템 설정 저장
    ├── package.json                  # 의존성 관리
    ├── tsconfig.json                 # TypeScript 설정
    ├── tailwind.config.ts            # Tailwind CSS 설정
    └── next.config.js                # Next.js 설정
```

## 📄 페이지 구성

| 경로        | 설명             | 주요 기능                                                 |
| ----------- | ---------------- | --------------------------------------------------------- |
| `/`         | 메인 랜딩 페이지 | 시스템 아키텍처 소개, 6개 메뉴 카드, 프로젝트 개요        |
| `/monitor`  | 실시간 모니터링  | 라인 상태, 윈도우 정보, 불량 카운트 실시간 표시           |
| `/defects`  | 불량 이력        | 발생한 불량 목록 조회, 테이블 형식 표시                   |
| `/admin`    | 관리자 페이지    | 불량 규칙 추가/삭제, 서비스 시작/정지, 규칙 활성화 토글   |
| `/settings` | 시스템 설정      | 폴링 주기, Mock 모드, 윈도우 시간, 알림, PLC/DB 연결 설정 |
| `/logs`     | 시스템 로그      | 실시간 로그 스트리밍, 필터링, 검색, 로그 삭제             |
| `/help`     | 도움말           | 사용 가이드, FAQ, Troubleshooting, 시스템 아키텍처        |

## 🔌 API 엔드포인트

| Method | Endpoint                  | 설명             | Request Body                           | Response                                    |
| ------ | ------------------------- | ---------------- | -------------------------------------- | ------------------------------------------- |
| GET    | `/api/init`               | 서비스 초기화    | -                                      | 초기화 상태                                 |
| GET    | `/api/status`             | 현재 상태 조회   | -                                      | 라인 상태, 윈도우 정보, 카운트, 시스템 상태 |
| POST   | `/api/admin/control`      | 서비스 시작/정지 | `{"action": "start"\|"stop"}`          | 상태 메시지                                 |
| POST   | `/api/resolve`            | 라인 정지 해제   | `{"reason": "string"}`                 | 성공 메시지                                 |
| GET    | `/api/admin/rules`        | 규칙 조회        | -                                      | 규칙 리스트                                 |
| POST   | `/api/admin/rules`        | 규칙 추가        | `DefectRule`                           | 추가된 규칙                                 |
| PUT    | `/api/admin/rules/{code}` | 규칙 수정        | `DefectRule`                           | 수정된 규칙                                 |
| DELETE | `/api/admin/rules/{code}` | 규칙 삭제        | -                                      | 성공 메시지                                 |
| GET    | `/api/defects`            | 불량 이력 조회   | -                                      | 불량 리스트                                 |
| GET    | `/api/logs`               | 로그 조회        | Query: level, component, search, limit | 로그 리스트                                 |
| DELETE | `/api/logs`               | 로그 삭제        | -                                      | 성공 메시지                                 |
| GET    | `/api/settings`           | 설정 조회        | -                                      | 현재 설정                                   |
| POST   | `/api/settings`           | 설정 저장        | 설정 객체                              | 저장된 설정                                 |

## 🛠️ 기술 스택

### Core

- **Framework**: Next.js 15.1.0 (App Router + API Routes)
- **Language**: TypeScript 5
- **Runtime**: Node.js 20+

### Frontend

- **Styling**: Tailwind CSS 3.4.1
- **UI Components**:
  - lucide-react 0.378.0 (아이콘)
  - framer-motion 11.2.0 (애니메이션)
  - @tanstack/react-table 8.17.3 (테이블)
- **Utilities**:
  - clsx 2.1.1 (클래스 조합)
  - tailwind-merge 2.3.0 (Tailwind 클래스 병합)
  - class-variance-authority 0.7.0 (변형 관리)
- **HTTP Client**: axios 1.6.8
- **Date Formatting**: date-fns 3.6.0

### Backend (Next.js API Routes)

- **서비스 레이어**: `lib/services/` 디렉토리
  - `monitor.ts`: 모니터링 핵심 로직
  - `plc.ts`: PLC 통신 인터페이스
  - `db.ts`: 데이터베이스 인터페이스
  - `logger.ts`: 로그 시스템
  - `state.ts`: 전역 상태 관리
- **데이터 저장**: JSON 파일 (defect_rules.json, settings.json)
- **로그 관리**: 메모리 기반 로그 시스템 (최대 1000개)

### External Integration (준비 중)

- **PLC 통신**: Modbus/TCP 또는 전용 프로토콜
- **Database**: Oracle DB 연동 준비

## 🧠 핵심 비즈니스 로직

### 1. 윈도우 기반 불량 집계

**위치**: `src/lib/services/monitor.ts` - `handleDefect()` 메서드

```typescript
// 윈도우가 비활성 상태면 새로 시작
if (!globalState.isWindowActive()) {
  console.log(`[Monitor] Starting New Window triggered by ${defect.code}`);
  logger.log("INFO", "Monitor", `새 윈도우 시작 (불량 코드: ${defect.code})`);
  globalState.setWindowStartTime(now);
  globalState.setWindowEndTime(new Date(now.getTime() + 60 * 60 * 1000)); // 1시간 후
  globalState.setCurrentCounts({});
  globalState.setCurrentDefects([]);
}

// 윈도우에 불량 추가
globalState.addDefect(defect);
globalState.incrementCount(defect.code);
```

**동작 원리:**

- 첫 불량 발생 시 설정된 시간(기본 1시간) 윈도우 시작
- 윈도우 내에서 불량 코드별로 카운트 누적
- 시간 만료 시에만 윈도우 자동 리셋
- **라인 재가동 시 윈도우 리셋** (새로운 생산 사이클 시작)
- 모든 상태는 `globalState`에 저장되어 모든 API 라우트에서 공유

### 2. 자동 라인 정지

**위치**: `src/lib/services/monitor.ts` - `handleDefect()` 메서드

```typescript
// 타입 기반 임계값 체크
if (count >= rule.threshold) {
  if (plc.readStatus() === "RUNNING") {
    const reason = `${rule.name} (${defect.code}/${defect.type}) ${count}회 발생 (기준 ${rule.threshold}회)`;
    logger.log("WARN", "Monitor", `임계값 초과! ${reason}`);
    plc.stopLine(reason);
    this.recordPlcStop(); // PLC 정지 명령 기록
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
  // 예: PLC 메모리 this.address에 1을 씀
}
```

**특징:**

- 불량 타입(APPEARANCE, FUNCTION, COMMON_SENSE)별로 정지 사유 기록
- PLC 정지 명령 시간 추적 (시스템 상태에 표시)
- Mock 모드에서는 메모리 상태만 변경

### 3. 라인 재가동 및 윈도우 리셋

**위치**: `src/lib/services/monitor.ts` - `resolveStop()` 메서드

```typescript
resolveStop(reason: string): void {
  plc.resetLine();

  // 라인 재시작 시 윈도우를 리셋합니다.
  // 이는 새로운 생산 사이클이 시작된다는 의미이기 때문입니다.
  console.log('[Monitor] Line resolved. Resetting window.');
  logger.log('INFO', 'Monitor', `라인이 재시작되었습니다. 윈도우를 리셋합니다. (사유: ${reason})`);
  globalState.resetWindow();

  this.lastPlcCommand = new Date();
  this.lastPlcCommandType = 'RESET';
}
```

**동작 원리:**

- 라인 재가동 시 윈도우를 완전히 리셋
- 새로운 생산 사이클 시작을 의미
- 카운트, 불량 리스트, 시작/종료 시간 모두 초기화

### 4. Mock 모드 시뮬레이션

**위치**: `src/lib/services/db.ts` - `generateMockDefects()` 메서드

```typescript
generateMockDefects(): Defect[] {
  const defects: Defect[] = [];
  const activeRules = Array.from(this.rules.values()).filter(r => r.is_active);

  if (activeRules.length === 0) return defects;

  // 30% 확률로 불량 발생
  if (Math.random() < 0.3) {
    // 1회~3회 연속 발생
    const count = Math.floor(Math.random() * 3) + 1;
    const rule = activeRules[Math.floor(Math.random() * activeRules.length)];

    for (let i = 0; i < count; i++) {
      defects.push({
        id: `MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        code: rule.code,
        type: rule.type,
        timestamp: new Date(),
      });
    }
  }

  return defects;
}
```

**특징:**

- 30% 확률로 불량 발생
- 1회~3회 연속 발생 가능
- 활성화된 규칙 중에서 랜덤 선택
- 더 현실적인 불량 시뮬레이션

### 5. 로그 시스템

**위치**: `src/lib/services/logger.ts`

```typescript
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

  // 최대 1000개 유지
  if (this.logs.length > 1000) {
    this.logs = this.logs.slice(0, 1000);
  }
}
```

**특징:**

- 메모리 기반 로그 저장 (최대 1000개)
- 4가지 로그 레벨: INFO, WARN, ERROR, DEBUG
- 6가지 컴포넌트: Monitor, PLC, DB, API, System, Admin
- 필터링 및 검색 기능 지원
- 고유 ID 자동 생성

## 📋 설정 파일 구조

### 1. defect_rules.json - 불량 규칙 저장

```json
{
  "NG001": {
    "code": "NG001",
    "name": "외관불량",
    "type": "APPEARANCE",
    "threshold": 5,
    "is_active": true,
    "created_at": "2025-11-26T04:46:13.120Z"
  },
  "NG002": {
    "code": "NG002",
    "name": "기능불량",
    "type": "FUNCTION",
    "threshold": 3,
    "is_active": true,
    "created_at": "2025-11-26T06:46:02.303Z"
  },
  "NG003": {
    "code": "NG003",
    "name": "상식이하",
    "type": "COMMON_SENSE",
    "threshold": 1,
    "is_active": true,
    "created_at": "2025-11-26T06:46:16.416Z"
  }
}
```

**필드 설명:**

- `code`: 불량 코드 (고유 식별자)
- `name`: 불량 이름 (한글 표시명)
- `type`: 불량 타입 (APPEARANCE, FUNCTION, COMMON_SENSE)
- `threshold`: 임계값 (이 횟수 이상 발생 시 라인 정지)
- `is_active`: 활성화 여부
- `created_at`: 규칙 생성 시간

### 2. settings.json - 시스템 설정 저장

```json
{
  "polling": {
    "interval": 5
  },
  "mock": {
    "plc": true,
    "db": true
  },
  "window": {
    "duration": 1
  },
  "notification": {
    "browser": true,
    "sound": true
  },
  "plc": {
    "ip": "192.168.0.1",
    "port": 5000,
    "address": "D100"
  },
  "db": {
    "host": "localhost",
    "port": 1521,
    "service": "xe",
    "user": "system",
    "password": ""
  }
}
```

**섹션 설명:**

#### polling

- `interval`: DB 폴링 주기 (초 단위, 1-10)

#### mock

- `plc`: PLC Mock 모드 활성화 여부
- `db`: DB Mock 모드 활성화 여부

#### window

- `duration`: 윈도우 지속 시간 (시간 단위, 1-24)

#### notification

- `browser`: 브라우저 알림 활성화 여부
- `sound`: 소리 알림 활성화 여부

#### plc

- `ip`: PLC IP 주소
- `port`: PLC 포트 번호
- `address`: PLC 메모리 주소

#### db

- `host`: 데이터베이스 호스트
- `port`: 데이터베이스 포트
- `service`: Oracle 서비스 이름
- `user`: 데이터베이스 사용자
- `password`: 데이터베이스 비밀번호

## 🔧 유틸리티 스크립트

### kill-port-3003.bat (Windows 배치 파일)

3003 포트를 사용하는 프로세스를 종료하는 배치 스크립트입니다.

**사용법:**

```bash
kill-port-3003.bat
```

**특징:**

- 더블클릭으로 바로 실행 가능
- 관리자 권한 필요
- netstat와 taskkill 명령 사용
- 한글 안내 메시지

### kill-port-3003.ps1 (PowerShell 스크립트)

3003 포트를 사용하는 프로세스를 종료하는 PowerShell 스크립트입니다.

**사용법:**

```powershell
.\kill-port-3003.ps1
```

**특징:**

- 더 상세한 프로세스 정보 제공
- 색상으로 구분된 출력
- Get-NetTCPConnection 사용
- 프로세스 이름, PID, 경로 표시

**최초 실행 시:**

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 🎯 향후 개선 사항

### 단기 목표

- [ ] 실제 PLC 통신 구현 (Modbus/TCP)
- [ ] Oracle DB 연동
- [ ] 환경 변수 관리 (.env.local)
- [ ] WebSocket 기반 실시간 업데이트
- [ ] 불량 이미지 첨부 기능

### 중기 목표

- [ ] 로그 파일 다운로드 기능 (CSV, JSON)
- [ ] 날짜 범위 필터
- [ ] 차트 및 통계 대시보드
- [ ] 브라우저 알림 구현
- [ ] 소리 알림 구현
- [ ] 불량 이력 페이지네이션

### 장기 목표

- [ ] 다국어 지원 (i18n)
- [ ] 모바일 반응형 디자인 개선
- [ ] 모바일 앱 개발 (React Native)
- [ ] AI 기반 불량 예측
- [ ] 외부 시스템 연동 (ERP, MES)
- [ ] 사용자 권한 관리
- [ ] 불량 트렌드 분석

## 📚 문서

- **[CLAUDE.md](CLAUDE.md)** - 개발자를 위한 상세 가이드
- **[PROJECT_COMPLETE.md](PROJECT_COMPLETE.md)** - 프로젝트 완료 보고서
- **[도움말 페이지](/help)** - 사용자를 위한 상세 가이드

## 🤝 기여

프로젝트 개선 아이디어나 버그 리포트는 이슈로 등록해주세요.

## 📝 라이선스

이 프로젝트는 내부 사용 목적으로 개발되었습니다.

---

**Ghost Eclipse** - 스마트 팩토리의 품질을 지키는 감시자 👻
