/**
 * @file src/lib/types.ts
 * @description
 * 애플리케이션 전체에서 사용되는 TypeScript 타입 정의
 *
 * 주요 타입:
 * - DefectRule: 불량 감지 규칙
 * - Defect: 불량 발생 이력
 * - MonitorStatus: 모니터링 시스템 전체 상태
 * - WindowInfo: 윈도우 집계 정보
 */

/**
 * 불량 타입
 * - APPEARANCE: 외관 불량
 * - FUNCTION: 기능 불량
 * - PL: 안전(Product Liability) 불량
 * - COMMON_SENSE: 상식이하 불량
 */
export type DefectType = "APPEARANCE" | "FUNCTION" | "PL" | "COMMON_SENSE";

/**
 * 불량 감지 규칙 모델
 */
export interface DefectRule {
  /** 불량 코드 (예: NG001) */
  code: string;
  /** 불량 이름 (예: 표면 스크래치) */
  name: string;
  /** 불량 타입 */
  type: DefectType;
  /** 임계값 (1시간 내 이 횟수 초과 시 라인 정지) */
  threshold: number;
  /** 활성화 여부 */
  is_active: boolean;
  /** 생성 일시 */
  created_at?: string;
}

/**
 * 불량 발생 이력 모델
 */
export interface Defect {
  /** 고유 ID */
  id: string;
  /** 불량 코드 */
  code: string;
  /** 불량 이름 */
  name: string;
  /** 불량 타입 */
  type: DefectType;
  /** 발생 시각 */
  timestamp: string;
  /** 해결 여부 */
  resolved: boolean;
}

/**
 * 윈도우 집계 정보
 */
export interface WindowInfo {
  /** 윈도우 시작 시간 (ISO 8601) */
  start: string | null;
  /** 윈도우 종료 시간 (ISO 8601) */
  end: string | null;
  /** 윈도우 활성 여부 */
  is_active: boolean;
}

/**
 * 모니터링 시스템 전체 상태
 */
export interface MonitorStatus {
  /** 모니터링 서비스 실행 여부 */
  is_running: boolean;
  /** 라인 상태 ('RUNNING' | 'STOPPED') */
  line_status: "RUNNING" | "STOPPED";
  /** 정지 사유 */
  stop_reason: string;
  /** 윈도우 정보 */
  window_info: WindowInfo;
  /** 현재 불량 코드별 카운트 */
  current_counts: Record<string, number>;
  /** 현재 윈도우의 불량 리스트 */
  current_defects: Defect[];
  /** 임계값 초과된 타입 목록 (라인 정지 원인인 타입들) */
  violated_types: DefectType[];
  /** DB 폴링 주기 (초) */
  polling_interval?: number;
  /** 활성화된 규칙 목록 */
  rules?: DefectRule[];
  /** 시스템 상태 (새로 추가됨) */
  system_status?: {
    /** DB 폴링 상태 */
    db_polling: boolean;
    /** DB 모드 (Mock/Real) */
    db_mode: "Mock" | "Real";
    /** PLC 연결 상태 */
    plc_connected: boolean;
    /** PLC 모드 (Mock/Real) */
    plc_mode: "Mock" | "Real";
    /** 마지막 PLC 명령 전송 시간 */
    last_plc_command: string | null;
    /** 마지막 PLC 명령 내용 */
    last_plc_command_type: "STOP" | "RESET" | null;
    /** ⭐ 마지막 DB 폴링 실행 시간 (processCycle이 실행된 시간) */
    last_polling_time: string | null;
  };
}

/**
 * 사용자 정보
 */
export interface User {
  /** 사용자 ID */
  id: string;
  /** 사용자 이름 */
  username: string;
  /** 표시 이름 */
  displayName: string;
  /** 역할 */
  role: "admin" | "user";
}

/**
 * 세션 정보
 */
export interface Session {
  /** 세션 ID */
  id: string;
  /** 사용자 정보 */
  user: User;
  /** 생성 시간 */
  createdAt: Date;
  /** 만료 시간 */
  expiresAt: Date;
}

/**
 * 알림 타입
 */
export type NotificationType =
  | "LINE_STOP" // 라인 정지
  | "LINE_RESUME" // 라인 재가동
  | "SERVICE_START" // 서비스 시작
  | "SERVICE_STOP"; // 서비스 정지

/**
 * 알림 정보
 */
export interface Notification {
  /** 알림 ID */
  id: string;
  /** 알림 타입 */
  type: NotificationType;
  /** 알림 제목 */
  title: string;
  /** 알림 메시지 */
  message: string;
  /** 생성 시간 */
  timestamp: Date;
  /** 읽음 여부 */
  isRead: boolean;
  /** 추가 데이터 */
  data?: any;
}
