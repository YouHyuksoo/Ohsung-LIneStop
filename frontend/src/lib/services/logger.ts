/**
 * @file src/lib/services/logger.ts
 * @description
 * 중앙 집중식 로그 관리 시스템
 *
 * 주요 기능:
 * - 모든 시스템 로그를 메모리에 저장
 * - 로그 레벨별 분류 (INFO, WARN, ERROR, DEBUG)
 * - 컴포넌트별 로그 관리 (Monitor, PLC, DB, API)
 * - 실시간 로그 조회 API 제공
 *
 * 사용법:
 * import { logger } from '@/lib/services/logger';
 * logger.info('Monitor', '서비스가 시작되었습니다');
 * logger.error('PLC', 'PLC 연결 실패', error);
 *
 * @example
 * logger.info('Monitor', 'Window started', { windowId: 123 });
 * logger.warn('DB', 'Connection slow', { latency: 5000 });
 * logger.error('PLC', 'Failed to stop line', error);
 */

/**
 * 로그 레벨 타입
 */
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

/**
 * 로그 컴포넌트 타입
 */
export type LogComponent =
  | 'Monitor'
  | 'PLC'
  | 'DB'
  | 'API'
  | 'System'
  | 'Admin';

/**
 * 로그 엔트리 인터페이스
 */
export interface LogEntry {
  /** 고유 ID */
  id: string;
  /** 로그 레벨 */
  level: LogLevel;
  /** 컴포넌트 이름 */
  component: LogComponent;
  /** 로그 메시지 */
  message: string;
  /** 추가 데이터 (선택사항) */
  data?: any;
  /** 발생 시각 */
  timestamp: Date;
}

/**
 * 로거 클래스
 */
class Logger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000; // 최대 저장 로그 수

  /**
   * INFO 레벨 로그 기록
   */
  info(component: LogComponent, message: string, data?: any): void {
    this.log('INFO', component, message, data);
    console.log(`[${component}] ${message}`, data || '');
  }

  /**
   * WARN 레벨 로그 기록
   */
  warn(component: LogComponent, message: string, data?: any): void {
    this.log('WARN', component, message, data);
    console.warn(`[${component}] ${message}`, data || '');
  }

  /**
   * ERROR 레벨 로그 기록
   */
  error(component: LogComponent, message: string, data?: any): void {
    this.log('ERROR', component, message, data);
    console.error(`[${component}] ${message}`, data || '');
  }

  /**
   * DEBUG 레벨 로그 기록
   */
  debug(component: LogComponent, message: string, data?: any): void {
    this.log('DEBUG', component, message, data);
    console.debug(`[${component}] ${message}`, data || '');
  }

  /**
   * 로그 저장 (공개 메서드)
   */
  log(
    level: LogLevel,
    component: LogComponent,
    message: string,
    data?: any
  ): void {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      level,
      component,
      message,
      data,
      timestamp: new Date(),
    };

    this.logs.unshift(entry); // 최신 로그를 앞에 추가

    // 최대 로그 수 초과 시 오래된 로그 삭제
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
  }

  /**
   * 모든 로그 조회
   */
  getLogs(limit?: number): LogEntry[] {
    return limit ? this.logs.slice(0, limit) : this.logs;
  }

  /**
   * 레벨별 로그 조회
   */
  getLogsByLevel(level: LogLevel, limit?: number): LogEntry[] {
    const filtered = this.logs.filter((log) => log.level === level);
    return limit ? filtered.slice(0, limit) : filtered;
  }

  /**
   * 컴포넌트별 로그 조회
   */
  getLogsByComponent(component: LogComponent, limit?: number): LogEntry[] {
    const filtered = this.logs.filter((log) => log.component === component);
    return limit ? filtered.slice(0, limit) : filtered;
  }

  /**
   * 필터와 검색을 적용한 로그 조회
   */
  getFilteredLogs(filters: {
    level?: LogLevel;
    component?: LogComponent;
    search?: string;
    limit?: number;
  }): LogEntry[] {
    let filtered = [...this.logs];

    // 레벨 필터
    if (filters.level) {
      filtered = filtered.filter((log) => log.level === filters.level);
    }

    // 컴포넌트 필터
    if (filters.component) {
      filtered = filtered.filter((log) => log.component === filters.component);
    }

    // 검색어 필터
    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter((log) =>
        log.message.toLowerCase().includes(query)
      );
    }

    // 제한
    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  /**
   * 로그 검색 (메시지 포함 여부)
   */
  searchLogs(query: string, limit?: number): LogEntry[] {
    const filtered = this.logs.filter((log) =>
      log.message.toLowerCase().includes(query.toLowerCase())
    );
    return limit ? filtered.slice(0, limit) : filtered;
  }

  /**
   * 모든 로그 삭제
   */
  clearLogs(): void {
    this.logs = [];
    console.log('[Logger] All logs cleared');
  }

  /**
   * 로그 통계 조회
   */
  getStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byComponent: Record<LogComponent, number>;
  } {
    const byLevel: Record<LogLevel, number> = {
      INFO: 0,
      WARN: 0,
      ERROR: 0,
      DEBUG: 0,
    };

    const byComponent: Record<LogComponent, number> = {
      Monitor: 0,
      PLC: 0,
      DB: 0,
      API: 0,
      System: 0,
      Admin: 0,
    };

    this.logs.forEach((log) => {
      byLevel[log.level]++;
      byComponent[log.component]++;
    });

    return {
      total: this.logs.length,
      byLevel,
      byComponent,
    };
  }
}

/**
 * 전역 로거 인스턴스
 */
export const logger = new Logger();
