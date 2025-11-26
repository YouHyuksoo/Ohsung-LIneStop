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
 * 불량 감지 규칙 모델
 */
export interface DefectRule {
  /** 불량 코드 (예: NG001) */
  code: string;
  /** 불량 이름 (예: 표면 스크래치) */
  name: string;
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
  line_status: 'RUNNING' | 'STOPPED';
  /** 정지 사유 */
  stop_reason: string;
  /** 윈도우 정보 */
  window_info: WindowInfo;
  /** 현재 불량 코드별 카운트 */
  current_counts: Record<string, number>;
  /** 현재 윈도우의 불량 리스트 */
  current_defects: Defect[];
  /** 시스템 상태 (새로 추가됨) */
  system_status?: {
    /** DB 폴링 상태 */
    db_polling: boolean;
    /** DB 모드 (Mock/Real) */
    db_mode: 'Mock' | 'Real';
    /** PLC 연결 상태 */
    plc_connected: boolean;
    /** PLC 모드 (Mock/Real) */
    plc_mode: 'Mock' | 'Real';
    /** 마지막 PLC 명령 전송 시간 */
    last_plc_command: string | null;
    /** 마지막 PLC 명령 내용 */
    last_plc_command_type: 'STOP' | 'RESET' | null;
  };
}
