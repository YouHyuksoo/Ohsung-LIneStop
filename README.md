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
- [설정 방법](#설정-방법)
- [향후 개선 사항](#향후-개선-사항)

## 🎯 프로젝트 개요

**Ghost Eclipse**는 제조 라인의 불량을 실시간으로 모니터링하고, 설정된 임계값을 초과하면 자동으로 라인을 정지시켜 대량 불량을 방지하는 스마트 팩토리 솔루션입니다.

### 핵심 특징

- **윈도우 기반 집계**: 첫 불량 발생 시 1시간 윈도우를 시작하여 불량 패턴 분석
- **자동 라인 정지**: 임계값 초과 시 PLC에 정지 신호를 전송하여 즉시 대응
- **실시간 로그 시스템**: 모든 시스템 이벤트를 추적하고 검색 가능
- **직관적인 설정**: UI를 통해 모니터링 주기, Mock 모드, 알림 등을 손쉽게 설정
- **통합 도움말**: 시스템 사용법과 문제 해결 가이드 제공

## ✨ 주요 기능

### 1. 📊 실시간 모니터링

- **1초 간격** 상태 업데이트
- 라인 상태 실시간 표시 (RUNNING/STOPPED)
- 윈도우 진행 상황 시각화
- 불량 코드별 카운트 실시간 추적
- 색상 및 애니메이션을 통한 시각적 피드백

### 2. 🎯 윈도우 기반 불량 집계

- 첫 불량 발생 시 **1시간 윈도우** 자동 시작
- 윈도우 내 불량 코드별 **누적 카운팅**
- 윈도우 만료 시 자동 리셋
- 라인 재가동 시에도 윈도우 유지 (재발 방지)

### 3. 🚨 자동 라인 정지

- 불량 코드별 임계값 설정
- 임계값 초과 시 **PLC에 정지 신호** 자동 전송
- 정지 사유 기록 및 표시
- 전체 화면 경고 알림

### 4. ⚙️ 규칙 기반 모니터링

- 불량 코드, 이름, 임계값 관리
- 규칙별 활성/비활성 토글
- JSON 파일로 영구 저장
- 실시간 규칙 추가/삭제

### 5. 📝 통합 로그 시스템

- **4가지 로그 레벨**: INFO, WARN, ERROR, DEBUG
- **6가지 컴포넌트**: Monitor, PLC, DB, API, System, Admin
- 레벨 및 컴포넌트별 필터링
- 검색 기능으로 특정 이벤트 추적
- 실시간 로그 스트리밍 (1초 폴링)

### 6. 🛠️ 시스템 설정

- 모니터링 폴링 주기 조정 (1-10초)
- PLC/DB Mock 모드 전환
- 윈도우 시간 설정 (1-24시간)
- 브라우저/소리 알림 설정

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

## 📁 프로젝트 구조

```
OhSung-LineStop/
├── README.md                          # 프로젝트 개요
├── CLAUDE.md                          # 개발 가이드 (Claude Code용)
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
    │   │       ├── status/           # 상태 조회
    │   │       ├── resolve/          # 라인 해제
    │   │       ├── defects/          # 불량 이력
    │   │       ├── logs/             # 로그 조회/삭제
    │   │       ├── settings/         # 설정 조회/저장
    │   │       └── admin/            # 관리 기능
    │   │           ├── control/      # 서비스 제어
    │   │           └── rules/        # 규칙 관리
    │   └── lib/
    │       ├── types.ts              # TypeScript 타입 정의
    │       ├── utils.ts              # 유틸리티 함수
    │       └── services/             # Backend 서비스 로직
    │           ├── monitor.ts        # 모니터링 서비스
    │           ├── plc.ts            # PLC 통신
    │           ├── db.ts             # 데이터베이스
    │           └── logger.ts         # 로그 시스템
    ├── defect_rules.json             # 불량 규칙 영구 저장
    └── settings.json                 # 시스템 설정 저장
```

## 📄 페이지 구성

| 경로 | 설명 | 주요 기능 |
|------|------|----------|
| `/` | 메인 랜딩 페이지 | 시스템 아키텍처 소개, 6개 메뉴 카드 |
| `/monitor` | 실시간 모니터링 | 라인 상태, 윈도우 정보, 불량 카운트 실시간 표시 |
| `/defects` | 불량 이력 | 발생한 불량 목록 조회 |
| `/admin` | 관리자 페이지 | 불량 규칙 추가/삭제, 서비스 시작/정지 |
| `/settings` | 시스템 설정 | 폴링 주기, Mock 모드, 윈도우 시간, 알림 설정 |
| `/logs` | 시스템 로그 | 실시간 로그 스트리밍, 필터링, 검색 |
| `/help` | 도움말 | 사용 가이드, FAQ, Troubleshooting |

## 🔌 API 엔드포인트

| Method | Endpoint | 설명 | Request Body | Response |
|--------|----------|------|--------------|----------|
| GET | `/api/status` | 현재 상태 조회 | - | 라인 상태, 윈도우 정보, 카운트 |
| POST | `/api/admin/control` | 서비스 시작/정지 | `{"action": "start"\|"stop"}` | 상태 메시지 |
| POST | `/api/resolve` | 라인 정지 해제 | `{"reason": "string"}` | 성공 메시지 |
| GET | `/api/admin/rules` | 규칙 조회 | - | 규칙 리스트 |
| POST | `/api/admin/rules` | 규칙 추가 | `DefectRule` | 추가된 규칙 |
| DELETE | `/api/admin/rules/{code}` | 규칙 삭제 | - | 성공 메시지 |
| GET | `/api/defects` | 불량 이력 조회 | - | 불량 리스트 |
| GET | `/api/logs` | 로그 조회 | Query: level, component, search, limit | 로그 리스트 |
| DELETE | `/api/logs` | 로그 삭제 | - | 성공 메시지 |
| GET | `/api/settings` | 설정 조회 | - | 현재 설정 |
| POST | `/api/settings` | 설정 저장 | 설정 객체 | 저장된 설정 |

## 🛠️ 기술 스택

### Core
- **Framework**: Next.js 15 (App Router + API Routes)
- **Language**: TypeScript 5
- **Runtime**: Node.js

### Frontend
- **Styling**: Tailwind CSS
- **Icons**: lucide-react
- **Animation**: framer-motion
- **HTTP Client**: axios
- **Date Formatting**: date-fns

### Backend (Next.js API Routes)
- **서비스 레이어**: `lib/services/` 디렉토리
- **데이터 저장**: JSON 파일 (defect_rules.json, settings.json)
- **로그 관리**: 메모리 기반 로그 시스템 (최대 1000개)

### External Integration (준비 중)
- **PLC 통신**: pymcprotocol 호환 라이브러리로 마이그레이션 가능
- **Database**: Oracle DB 연동 준비

## 🧠 핵심 비즈니스 로직

### 1. 윈도우 기반 불량 집계

**위치**: `src/lib/services/monitor.ts` - `handleDefect()` 메서드

```typescript
// 윈도우가 비활성 상태면 새로 시작
if (!this.isWindowActive()) {
  this.windowStartTime = now;
  this.windowEndTime = new Date(now.getTime() + 60 * 60 * 1000); // 1시간 후
  this.currentCounts = {};
  this.windowDefects = [];
}

// 윈도우에 불량 추가
this.windowDefects.push(defect);
this.currentCounts[defect.code] = (this.currentCounts[defect.code] || 0) + 1;
```

**동작 원리:**
- 첫 불량 발생 시 1시간 윈도우 시작
- 윈도우 내에서 불량 코드별로 카운트 누적
- 시간 만료 시에만 윈도우 리셋 (`resetWindow()`)
- **중요**: 라인 재가동 시에는 윈도우 유지 (재발 방지)

### 2. 자동 라인 정지

**위치**: `src/lib/services/monitor.ts` - `handleDefect()` 메서드

```typescript
// 임계값 체크
if (count >= rule.threshold) {
  if (plc.readStatus() === 'RUNNING') {
    const reason = `${rule.name} (${defect.code}) ${count}회 발생 (기준 ${rule.threshold}회)`;
    plc.stopLine(reason);
  }
}
```

**위치**: `src/lib/services/plc.ts` - `stopLine()` 메서드

```typescript
stopLine(reason: string): void {
  console.log(`[PLC] !!! STOP LINE COMMAND SENT !!! Reason: ${reason}`);
  this.isStopped = true;
  this._stopReason = reason;
  // TODO: 실제 PLC에 정지 신호 전송
}
```

### 3. 로그 시스템

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
}
```

**특징:**
- 메모리 기반 로그 저장 (최대 1000개)
- 4가지 로그 레벨: INFO, WARN, ERROR, DEBUG
- 6가지 컴포넌트: Monitor, PLC, DB, API, System, Admin
- 필터링 및 검색 기능 지원

## ⚙️ 설정 방법

### Mock 모드 활성화/비활성화

#### PLC Mock 모드

**파일**: `src/lib/services/plc.ts`

```typescript
class PLC {
  private mockMode: boolean = true;  // True: Mock 모드, False: 실제 PLC 연결
}
```

#### DB Mock 모드

**파일**: `src/lib/services/db.ts`

```typescript
class Database {
  private mockMode: boolean = true;  // True: Mock 데이터, False: 실제 Oracle DB
}
```

**Mock DB 동작:**
- `fetchRecentDefects()`에서 10% 확률로 랜덤 불량 생성
- 테스트용으로 실제 DB 없이 불량 발생 시뮬레이션 가능

### UI를 통한 설정 변경

`/settings` 페이지에서 다음 항목들을 변경할 수 있습니다:
- 폴링 주기 (1-10초)
- PLC/DB Mock 모드
- 윈도우 시간 (1-24시간)
- 브라우저/소리 알림

## 🎯 향후 개선 사항

### 단기 목표
- [ ] 실제 PLC 통신 구현 (pymcprotocol 호환 라이브러리)
- [ ] Oracle DB 연동
- [ ] 환경 변수 관리 (.env.local)
- [ ] WebSocket 기반 실시간 업데이트

### 중기 목표
- [ ] 로그 파일 다운로드 기능
- [ ] 날짜 범위 필터
- [ ] 차트 및 통계 대시보드
- [ ] 알림 시스템 (브라우저 알림, 소리)

### 장기 목표
- [ ] 다국어 지원 (i18n)
- [ ] 모바일 앱 개발
- [ ] AI 기반 불량 예측
- [ ] 외부 시스템 연동 (ERP, MES)

## 📚 문서

- [개발 가이드 (CLAUDE.md)](CLAUDE.md) - 개발자를 위한 상세 가이드
- [도움말 페이지](/help) - 사용자를 위한 상세 가이드

## 🤝 기여

프로젝트 개선 아이디어나 버그 리포트는 이슈로 등록해주세요.

## 📝 라이선스

이 프로젝트는 내부 사용 목적으로 개발되었습니다.

---

**Ghost Eclipse** - 스마트 팩토리의 품질을 지키는 감시자 👻
