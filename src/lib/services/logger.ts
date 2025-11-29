/**
 * @file src/lib/services/logger.ts
 * @description
 * 중앙 집중식 로그 관리 시스템 (메모리 + SQLite)
 *
 * 주요 기능:
 * 1. 메모리 저장: 최신 1000개 로그를 RAM에 저장
 * 2. SQLite 저장: 모든 로그를 파일에 영구 저장
 * 3. 로그 레벨별 분류 (INFO, WARN, ERROR, DEBUG)
 * 4. 컴포넌트별 로그 관리 (Monitor, PLC, DB, API)
 * 5. 로그 삭제: 특정 기간/레벨별 삭제 지원
 * 6. 실시간 로그 조회 API 제공
 *
 * 저장 위치:
 * - SQLite DB: 프로젝트 루트/logs.db
 * - 메모리: 최신 1000개만 RAM에 유지
 *
 * 사용법:
 * import { logger } from '@/lib/services/logger';
 * logger.log('INFO', 'Monitor', '서비스가 시작되었습니다');
 * logger.log('ERROR', 'PLC', 'PLC 연결 실패');
 *
 * @example
 * logger.log('INFO', 'Monitor', 'Window started', { windowId: 123 });
 * logger.log('WARN', 'DB', 'Connection slow', { latency: 5000 });
 * logger.log('ERROR', 'PLC', 'Failed to stop line');
 */

/**
 * 로그 레벨 타입
 */
export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

/**
 * 로그 컴포넌트 타입
 */
export type LogComponent =
  | "Monitor"
  | "PLC"
  | "DB"
  | "API"
  | "System"
  | "Admin";

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
  private db: any = null;
  private dbPath: string = "";
  private isInitialized: boolean = false;

  constructor() {
    // Node.js 환경에서만 SQLite 초기화
    if (typeof window === "undefined") {
      this.initializeSQLite();
    }
  }

  /**
   * SQLite 데이터베이스 초기화
   */
  private initializeSQLite(): void {
    try {
      const path = require("path");
      // eslint-disable-next-line global-require
      const Database = require("better-sqlite3");

      this.dbPath = path.join(process.cwd(), "logs.db");
      this.db = new Database(this.dbPath);

      // 테이블 생성
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS logs (
          id TEXT PRIMARY KEY,
          level TEXT NOT NULL,
          component TEXT NOT NULL,
          message TEXT NOT NULL,
          data TEXT,
          timestamp TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_level ON logs(level);
        CREATE INDEX IF NOT EXISTS idx_component ON logs(component);
        CREATE INDEX IF NOT EXISTS idx_timestamp ON logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_created_at ON logs(created_at);
      `);

      this.isInitialized = true;
      // 초기화 시점에는 logger 자체가 초기화 중이므로 console.log 사용
      console.log(
        `[${new Date().toLocaleTimeString("ko-KR", {
          hour12: false,
        })}] [INFO] [Logger] SQLite 초기화 완료: ${this.dbPath}`
      );
    } catch (error: any) {
      console.warn("[Logger] SQLite initialization failed:", error.message);
      this.isInitialized = false;
    }
  }

  /**
   * SQLite에 로그 저장
   */
  private saveToSQLite(entry: LogEntry): void {
    if (!this.isInitialized || !this.db) return;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO logs (id, level, component, message, data, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        entry.id,
        entry.level,
        entry.component,
        entry.message,
        entry.data ? JSON.stringify(entry.data) : null,
        entry.timestamp.toISOString()
      );
    } catch (error: any) {
      console.warn("[Logger] Failed to save to SQLite:", error.message);
    }
  }

  /**
   * 콘솔에 로그 출력 (형식 통일)
   * 개발 모드에서는 모든 레벨 출력, 프로덕션에서는 DEBUG 제외
   */
  private printConsole(
    level: LogLevel,
    component: LogComponent,
    message: string,
    data?: any
  ): void {
    // 프로덕션 모드에서는 DEBUG 레벨 숨김
    if (process.env.NODE_ENV === "production" && level === "DEBUG") {
      return;
    }

    const time = new Date().toLocaleTimeString("ko-KR", { hour12: false });
    const formattedMessage = `[${time}] [${level}] [${component}] ${message}`;

    if (level === "ERROR") {
      console.error(formattedMessage, data || "");
    } else if (level === "WARN") {
      console.warn(formattedMessage, data || "");
    } else if (level === "DEBUG") {
      console.log(formattedMessage, data || ""); // DEBUG도 console.log로 출력 (개발 모드)
    } else {
      console.log(formattedMessage, data || "");
    }
  }

  /**
   * INFO 레벨 로그 기록
   */
  info(component: LogComponent, message: string, data?: any): void {
    this.log("INFO", component, message, data);
  }

  /**
   * WARN 레벨 로그 기록
   */
  warn(component: LogComponent, message: string, data?: any): void {
    this.log("WARN", component, message, data);
  }

  /**
   * ERROR 레벨 로그 기록
   */
  error(component: LogComponent, message: string, data?: any): void {
    this.log("ERROR", component, message, data);
  }

  /**
   * DEBUG 레벨 로그 기록
   */
  debug(component: LogComponent, message: string, data?: any): void {
    this.log("DEBUG", component, message, data);
  }

  /**
   * 로그 저장 (공개 메서드 - 메모리 + SQLite + 콘솔)
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

    // 메모리에 저장
    this.logs.unshift(entry); // 최신 로그를 앞에 추가

    // 최대 로그 수 초과 시 오래된 로그 삭제
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // SQLite에 저장
    this.saveToSQLite(entry);

    // 콘솔에 출력
    this.printConsole(level, component, message, data);
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
   * 모든 로그 삭제 (메모리 + SQLite)
   */
  clearLogs(): void {
    this.logs = [];

    // SQLite에서도 삭제
    if (this.isInitialized && this.db) {
      try {
        this.db.prepare("DELETE FROM logs").run();
        console.log("[Logger] All logs cleared from SQLite");
      } catch (error: any) {
        console.warn("[Logger] Failed to clear SQLite logs:", error.message);
      }
    }

    console.log("[Logger] All logs cleared");
  }

  /**
   * SQLite에서 로그 조회
   */
  getLogsFromDB(filters?: {
    level?: LogLevel;
    component?: LogComponent;
    search?: string;
    limit?: number;
    days?: number; // 최근 N일의 로그
  }): LogEntry[] {
    if (!this.isInitialized || !this.db) {
      return this.getLogs(filters?.limit);
    }

    try {
      let query = "SELECT * FROM logs WHERE 1=1";
      const params: any[] = [];

      // 레벨 필터
      if (filters?.level) {
        query += " AND level = ?";
        params.push(filters.level);
      }

      // 컴포넌트 필터
      if (filters?.component) {
        query += " AND component = ?";
        params.push(filters.component);
      }

      // 검색어 필터
      if (filters?.search) {
        query += " AND message LIKE ?";
        params.push(`%${filters.search}%`);
      }

      // 기간 필터
      if (filters?.days && filters.days > 0) {
        query += ' AND timestamp >= datetime("now", ? || " days")';
        params.push(`-${filters.days}`);
      }

      // 정렬 및 제한
      query += " ORDER BY timestamp DESC";
      if (filters?.limit) {
        query += " LIMIT ?";
        params.push(filters.limit);
      }

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params);

      return rows.map((row: any) => ({
        id: row.id,
        level: row.level as LogLevel,
        component: row.component as LogComponent,
        message: row.message,
        data: row.data ? JSON.parse(row.data) : undefined,
        timestamp: new Date(row.timestamp),
      }));
    } catch (error: any) {
      console.warn("[Logger] Failed to read from SQLite:", error.message);
      return this.getLogs(filters?.limit);
    }
  }

  /**
   * SQLite에서 로그 삭제
   */
  deleteLogsFromDB(filters?: {
    level?: LogLevel;
    component?: LogComponent;
    before?: Date; // 이 날짜 이전의 로그 삭제
    days?: number; // N일 이전의 로그 삭제
  }): number {
    if (!this.isInitialized || !this.db) return 0;

    try {
      let query = "DELETE FROM logs WHERE 1=1";
      const params: any[] = [];

      // 레벨 필터
      if (filters?.level) {
        query += " AND level = ?";
        params.push(filters.level);
      }

      // 컴포넌트 필터
      if (filters?.component) {
        query += " AND component = ?";
        params.push(filters.component);
      }

      // 날짜 필터
      if (filters?.before) {
        query += " AND timestamp < ?";
        params.push(filters.before.toISOString());
      }

      // 기간 필터 (N일 이전)
      if (filters?.days && filters.days > 0) {
        query += ' AND timestamp < datetime("now", ? || " days")';
        params.push(`-${filters.days}`);
      }

      const stmt = this.db.prepare(query);
      const info = stmt.run(...params);

      console.log(`[Logger] Deleted ${info.changes} logs from SQLite`);
      return info.changes;
    } catch (error: any) {
      console.warn("[Logger] Failed to delete from SQLite:", error.message);
      return 0;
    }
  }

  /**
   * SQLite 로그 통계
   */
  getDBStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byComponent: Record<LogComponent, number>;
    oldestLog: Date | null;
    newestLog: Date | null;
  } {
    if (!this.isInitialized || !this.db) {
      return {
        total: 0,
        byLevel: { INFO: 0, WARN: 0, ERROR: 0, DEBUG: 0 },
        byComponent: { Monitor: 0, PLC: 0, DB: 0, API: 0, System: 0, Admin: 0 },
        oldestLog: null,
        newestLog: null,
      };
    }

    try {
      // 전체 개수
      const totalResult = this.db
        .prepare("SELECT COUNT(*) as count FROM logs")
        .get() as any;
      const total = totalResult.count;

      // 레벨별 통계
      const levelResult = this.db
        .prepare("SELECT level, COUNT(*) as count FROM logs GROUP BY level")
        .all() as any[];
      const byLevel: Record<LogLevel, number> = {
        INFO: 0,
        WARN: 0,
        ERROR: 0,
        DEBUG: 0,
      };
      levelResult.forEach((row) => {
        byLevel[row.level as LogLevel] = row.count;
      });

      // 컴포넌트별 통계
      const componentResult = this.db
        .prepare(
          "SELECT component, COUNT(*) as count FROM logs GROUP BY component"
        )
        .all() as any[];
      const byComponent: Record<LogComponent, number> = {
        Monitor: 0,
        PLC: 0,
        DB: 0,
        API: 0,
        System: 0,
        Admin: 0,
      };
      componentResult.forEach((row) => {
        byComponent[row.component as LogComponent] = row.count;
      });

      // 최오래 로그와 최신 로그
      const dateResult = this.db
        .prepare(
          "SELECT MIN(timestamp) as oldest, MAX(timestamp) as newest FROM logs"
        )
        .get() as any;

      return {
        total,
        byLevel,
        byComponent,
        oldestLog: dateResult.oldest ? new Date(dateResult.oldest) : null,
        newestLog: dateResult.newest ? new Date(dateResult.newest) : null,
      };
    } catch (error: any) {
      console.warn("[Logger] Failed to get DB stats:", error.message);
      return {
        total: 0,
        byLevel: { INFO: 0, WARN: 0, ERROR: 0, DEBUG: 0 },
        byComponent: { Monitor: 0, PLC: 0, DB: 0, API: 0, System: 0, Admin: 0 },
        oldestLog: null,
        newestLog: null,
      };
    }
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
 * 전역 로거 인스턴스 (싱글톤)
 * Next.js 개발 환경에서 모듈 리로드 시 인스턴스가 초기화되는 것을 방지하기 위해
 * global 객체에 인스턴스를 저장하여 재사용합니다.
 */
const globalForLogger = global as unknown as { logger: Logger | undefined };

export const logger = globalForLogger.logger ?? new Logger();

if (process.env.NODE_ENV !== "production") {
  globalForLogger.logger = logger;
}
