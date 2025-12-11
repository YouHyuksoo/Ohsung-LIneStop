/**
 * @file src/lib/services/db.ts
 * @description
 * 데이터베이스 인터페이스 모듈
 *
 * 주요 기능:
 * 1. 불량 규칙 관리 (CRUD)
 *    - JSON 파일로 영구 저장
 *    - 코드, 이름, 임계값, 활성 상태 관리
 *
 * 2. 불량 데이터 조회
 *    - Oracle DB 연동 (ICOM_RECIEVE_DATA_NG 테이블)
 *    - Mock 모드에서 랜덤 불량 생성
 *
 * Mock 모드:
 * - 실제 DB 없이도 테스트 가능
 * - 10% 확률로 랜덤 불량 생성
 * - 활성화된 규칙 중에서 랜덤 선택
 *
 * 실제 모드:
 * - ICOM_RECIEVE_DATA_NG 테이블에서 불량 조회
 * - NG_REASON_CODE: 불량 코드
 * - 기본 정보로 불량 이름 생성
 * - ACTUAL_DATE 또는 ENTER_DATE로 발생 시각 사용
 *
 * 초보자 가이드:
 * 1. **rules**: 불량 규칙을 저장하는 Map 객체
 * 2. **mockDefects**: Mock 모드에서 생성된 불량 리스트
 * 3. **mockMode**: settings.json에서 설정 (mock.db)
 *
 * @example
 * import { db } from '@/lib/services/db';
 *
 * // 규칙 추가
 * db.saveRule({ code: 'NG001', name: '스크래치', type: 'APPEARANCE', threshold: 3, is_active: true });
 *
 * // 규칙 조회
 * const rules = db.getRules();
 *
 * // 최근 불량 조회
 * const defects = db.fetchRecentDefects();
 */

import { DefectRule, Defect } from "@/lib/types";
import { logger } from "./logger";
import fs from "fs";
import path from "path";

/**
 * Oracle DB 연결을 위한 동적 import
 * Node.js 환경에서만 사용 가능
 */
let oracledb: any = null;
if (typeof window === "undefined") {
  try {
    // eslint-disable-next-line global-require
    oracledb = require("oracledb");
    // Oracle Instant Client 설정 (필요시)
    // oracledb.initOracleClient({ libDir: process.env.ORACLE_CLIENT_LIB_DIR });
  } catch (error) {
    console.warn("[DB] Oracle DB client not available:", error);
  }
}

/**
 * 데이터베이스 클래스
 */
class Database {
  private rulesFile: string;
  private settingsFile: string;
  private rules: Map<string, DefectRule> = new Map();
  private _mockDefects: Defect[] = [];
  private mockMode: boolean = true;
  private defectProbability: number = 0.3; // 기본값: 30%

  // DB Connection Details
  private dbConfig = {
    host: "192.168.110.222",
    port: 1521,
    service: "OSCW",
    user: "INFINITY21_PIMMES",
    password: "",
  };

  constructor() {
    // Node.js 환경에서만 파일 시스템 사용 (API Routes)
    this.rulesFile = path.join(process.cwd(), "defect_rules.json");
    this.settingsFile = path.join(process.cwd(), "settings.json");

    this.loadRules();
    this.loadSettings();
  }

  /**
   * 설정 파일에서 DB 설정을 로드합니다.
   */
  private loadSettings(): void {
    try {
      if (fs.existsSync(this.settingsFile)) {
        const data = fs.readFileSync(this.settingsFile, "utf-8");
        const settings = JSON.parse(data);

        if (settings.db) {
          this.dbConfig = {
            host: settings.db.host || this.dbConfig.host,
            port: settings.db.port || this.dbConfig.port,
            service: settings.db.service || this.dbConfig.service,
            user: settings.db.user || this.dbConfig.user,
            password: settings.db.password || this.dbConfig.password,
          };
        }

        if (settings.mock) {
          if (typeof settings.mock.db === "boolean") {
            this.mockMode = settings.mock.db;
          }
          if (typeof settings.mock.db_defect_probability === "number") {
            this.defectProbability = settings.mock.db_defect_probability;
          }
        }

        if (!this.mockMode) {
          logger.log(
            "INFO",
            "DB",
            `Oracle DB 설정 로드됨 (${this.dbConfig.host}:${this.dbConfig.port}/${this.dbConfig.service})`
          );
        } else {
          logger.log(
            "INFO",
            "DB",
            `Mock DB 설정 로드됨 (불량 생성 확률: ${Math.round(
              this.defectProbability * 100
            )}%)`
          );
        }
      }
    } catch (error) {
      console.error("[DB] Failed to load settings:", error);
    }
  }

  /**
   * Oracle DB에 연결합니다.
   */
  private async connectToOracle(): Promise<any> {
    if (!oracledb) {
      throw new Error("Oracle DB client is not available");
    }

    try {
      // ⭐ 3초 타임아웃 적용
      const connectPromise = oracledb.getConnection({
        user: this.dbConfig.user,
        password: this.dbConfig.password,
        connectionString: `${this.dbConfig.host}:${this.dbConfig.port}/${this.dbConfig.service}`,
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("DB Connection timed out (3s)")),
          3000
        );
      });

      const connection = await Promise.race([connectPromise, timeoutPromise]);

      logger.log("INFO", "DB", "Oracle DB 연결 성공");
      return connection;
    } catch (error) {
      logger.log("ERROR", "DB", `Oracle DB 연결 실패: ${error}`);
      throw error;
    }
  }

  /**
   * ICOM_RECIEVE_DATA_NG 테이블에서 불량 데이터를 조회합니다.
   *
   * 조회 조건:
   * - 시간 범위: 현재 시점 기준 한시간 이전부터 현재까지 (ACTION_DATE 기준)
   * - 미처리 상태: NG_RELEASE_YN이 'Y'가 아닌 것 (미처리 불량)
   * - 정렬: ACTION_DATE 기준 최신순
   *
   * 테이블 매핑:
   * - NG_REASON_CODE → code (불량 코드)
   * - ITEM_LVL1/ITEM_LVL2/ITEM_LVL3 → name (불량 이름 조합)
   * - ACTION_DATE → timestamp (불량 발생 시각 - 인덱스 활용)
   * - DEFECT_TYPE → type (불량 유형 - P/A/F/L)
   * - NG_RELEASE_YN → resolved (미처리 여부)
   *
   * 주의사항:
   * - ACTION_DATE는 인덱싱되어 있으므로 이 컬럼을 조건으로 사용
   * - ACTUAL_DATE, ENTER_DATE는 부보조 컬럼 (필요시에만 사용)
   *
   * @returns 불량 배열
   */
  private async queryFromOracle(): Promise<Defect[]> {
    let connection = null;
    try {
      connection = await this.connectToOracle();

      const query = `
        SELECT
          ROWID as ID,
          NG_REASON_CODE as CODE,
          ITEM_LVL1 || '-' || ITEM_LVL2 || '-' || ITEM_LVL3 as NAME,
          ACTION_DATE as TIMESTAMP,
          DEFECT_TYPE,
          COALESCE(NG_RELEASE_YN, 'N') as RELEASE_YN
        FROM "INFINITY21_PIMMES"."ICOM_RECIEVE_DATA_NG"
        WHERE
          NG_REASON_CODE IS NOT NULL
          AND ACTION_DATE IS NOT NULL
          AND ACTION_DATE >= SYSDATE - 1/24
          AND ACTION_DATE <= SYSDATE
          AND COALESCE(NG_RELEASE_YN, 'N') != 'Y'
        ORDER BY ACTION_DATE DESC
        FETCH FIRST 1000 ROWS ONLY
      `;

      const result = await connection.execute(query, [], {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      // DB 데이터를 Defect 타입으로 변환
      const defects: Defect[] = (result.rows || []).map((row: any) => {
        const code = row.CODE || "UNKNOWN";
        let type: "APPEARANCE" | "FUNCTION" | "PL" | "COMMON_SENSE" =
          "COMMON_SENSE";
        const prefix = code.substring(0, 3);

        if (prefix === "3WA") type = "APPEARANCE";
        else if (prefix === "3WF") type = "FUNCTION";
        else if (prefix === "3WP") type = "PL";
        else if (prefix === "3WS") type = "COMMON_SENSE";

        return {
          id:
            row.ID ||
            `D-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          code: code,
          name: row.NAME || "미분류 불량",
          type: type,
          timestamp: row.TIMESTAMP
            ? new Date(row.TIMESTAMP).toISOString()
            : new Date().toISOString(),
          resolved: row.RELEASE_YN === "Y" ? true : false,
        };
      });

      logger.log(
        "INFO",
        "DB",
        `Oracle DB에서 ${defects.length}개 미처리 불량 조회 성공 (최근 1시간)`
      );
      return defects;
    } catch (error) {
      logger.log("ERROR", "DB", `Oracle DB 조회 실패: ${error}`);
      return [];
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (error) {
          console.error("[DB] Failed to close connection:", error);
        }
      }
    }
  }

  /**
   * SP_CHECK_LINE_STOP 프로시저를 호출하여 라인 정지 여부를 판단합니다.
   *
   * 규칙별로 호출되어 해당 불량 코드와 임계값을 기반으로
   * 현재 기준 1시간 범위 내 누적 불량 건수를 조회합니다.
   *
   * 파라미터:
   * - defectCode: 불량 코드 (규칙에서 정의)
   * - threshold: 임계값 (규칙에서 정의)
   *
   * 반환 값:
   * - resultCode: 'STOP' | 'PASS' | 'ERROR'
   * - message: 상세 메시지
   * - count: 해당 코드의 1시간 범위 누적 건수
   *
   * @param defectCode - 불량 코드
   * @param threshold - 임계값
   * @returns 프로시저 결과
   */
  async checkLineStopProcedure(
    defectCode: string,
    threshold: number
  ): Promise<{
    resultCode: string;
    message: string;
    count: number;
  }> {
    let connection = null;
    try {
      connection = await this.connectToOracle();

      // IN 파라미터와 OUT 파라미터를 위한 바인드 변수 설정
      const result = await connection.execute(
        `BEGIN SP_CHECK_LINE_STOP(:I_DEFECT_CODE, :I_THRESHOLD, :O_RESULT_CODE, :O_MESSAGE, :O_COUNT); END;`,
        {
          I_DEFECT_CODE: {
            dir: oracledb.BIND_IN,
            type: oracledb.STRING,
            val: defectCode,
          },
          I_THRESHOLD: {
            dir: oracledb.BIND_IN,
            type: oracledb.NUMBER,
            val: threshold,
          },
          O_RESULT_CODE: {
            dir: oracledb.BIND_OUT,
            type: oracledb.STRING,
            maxSize: 10,
          },
          O_MESSAGE: {
            dir: oracledb.BIND_OUT,
            type: oracledb.STRING,
            maxSize: 500,
          },
          O_COUNT: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        }
      );

      const resultCode = result.outBinds?.O_RESULT_CODE || "ERROR";
      const message = result.outBinds?.O_MESSAGE || "프로시저 실행 오류";
      const count = result.outBinds?.O_COUNT || 0;

      logger.log(
        "INFO",
        "DB",
        `SP_CHECK_LINE_STOP 프로시저 호출: ${defectCode} (임계값:${threshold}) → ${resultCode} (누적:${count}건) - ${message}`
      );

      return {
        resultCode,
        message,
        count,
      };
    } catch (error) {
      logger.log(
        "ERROR",
        "DB",
        `SP_CHECK_LINE_STOP 프로시저 호출 실패 (${defectCode}): ${error}`
      );
      return {
        resultCode: "ERROR",
        message: `프로시저 호출 실패: ${error}`,
        count: 0,
      };
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (error) {
          console.error("[DB] Failed to close connection:", error);
        }
      }
    }
  }

  /**
   * Mock 불량 리스트를 반환합니다.
   */
  get mockDefects(): Defect[] {
    return this._mockDefects;
  }

  /**
   * Mock 모드 여부를 반환합니다.
   */
  get isMockMode(): boolean {
    return this.mockMode;
  }

  /**
   * ⭐ NEW: 설정 파일을 다시 로드하여 메모리의 싱글톤 인스턴스를 업데이트합니다.
   * 설정 변경 후 즉시 반영하기 위해 사용합니다.
   */
  reloadSettings(): void {
    this.loadSettings();
  }

  /**
   * JSON 파일에서 규칙을 로드합니다.
   */
  private loadRules(): void {
    try {
      if (fs.existsSync(this.rulesFile)) {
        const data = fs.readFileSync(this.rulesFile, "utf-8");
        const rulesObj = JSON.parse(data) as Record<string, DefectRule>;
        this.rules = new Map(Object.entries(rulesObj));
        logger.log("INFO", "DB", `규칙 ${this.rules.size}개 로드 완료`);
      }
    } catch (error) {
      console.error("[DB] Failed to load rules:", error);
      logger.log("ERROR", "DB", `규칙 로드 실패: ${error}`);
    }
  }

  /**
   * 규칙을 JSON 파일에 저장합니다.
   */
  private persistRules(): void {
    try {
      const rulesObj = Object.fromEntries(this.rules);
      fs.writeFileSync(
        this.rulesFile,
        JSON.stringify(rulesObj, null, 2),
        "utf-8"
      );
    } catch (error) {
      console.error("[DB] Failed to persist rules:", error);
    }
  }

  /**
   * 규칙을 저장합니다.
   *
   * @param rule - 저장할 규칙
   */
  saveRule(rule: DefectRule): void {
    if (!rule.created_at) {
      rule.created_at = new Date().toISOString();
    }
    this.rules.set(rule.code, rule);
    this.persistRules();
    logger.log("INFO", "DB", `규칙 저장됨: ${rule.code} - ${rule.name}`);
  }

  /**
   * 규칙을 삭제합니다.
   *
   * @param code - 삭제할 규칙의 코드
   */
  deleteRule(code: string): void {
    this.rules.delete(code);
    this.persistRules();
    logger.log("INFO", "DB", `규칙 삭제됨: ${code}`);
  }

  /**
   * 모든 규칙을 조회합니다.
   *
   * @returns 규칙 배열
   */
  getRules(): DefectRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 특정 코드의 규칙을 조회합니다.
   *
   * @param code - 조회할 규칙의 코드
   * @returns 규칙 또는 undefined
   */
  getRule(code: string): DefectRule | undefined {
    return this.rules.get(code);
  }

  /**
   * 최근 발생한 불량을 조회합니다.
   *
   * Mock 모드: 랜덤으로 불량 생성
   * 실제 모드: Oracle DB에서 조회
   *
   * @returns 불량 배열
   */
  fetchRecentDefects(): Defect[] {
    if (this.mockMode) {
      return this.generateMockDefects();
    } else {
      // 실제 모드에서는 동기 함수이므로 빈 배열 반환
      // 비동기 조회는 getAllDefects()를 사용하거나 API 층에서 처리
      return [];
    }
  }

  /**
   * 테스트용 랜덤 불량을 생성합니다.
   * 활성화된 규칙 중에서 시뮬레이션 확률로 불량 발생
   *
   * Mock 모드 시뮬레이션:
   * - 설정된 확률로 한 번에 하나의 불량만 발생
   * - 실시간 모니터링을 위해 단일 불량 생성 방식으로 설계
   *
   * @returns 생성된 불량 배열 (최대 1개)
   */
  private generateMockDefects(): Defect[] {
    const newDefects: Defect[] = [];
    const now = new Date();

    const activeRules = Array.from(this.rules.values()).filter(
      (r) => r.is_active
    );

    if (activeRules.length === 0) {
      return newDefects; // 활성 규칙이 없으면 반환
    }

    // 설정된 확률로 불량 한 개만 발생
    if (Math.random() < this.defectProbability) {
      // 활성 규칙 중 랜덤 선택
      const rule = activeRules[Math.floor(Math.random() * activeRules.length)];

      // 규칙 코드(접두사) + 랜덤 숫자
      const randomSuffix = Math.floor(Math.random() * 999)
        .toString()
        .padStart(3, "0");
      const mockCode = `${rule.code}-${randomSuffix}`; // 예: 3WA-042

      const defect: Defect = {
        id: `D-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        code: mockCode,
        name: `${rule.name} (테스트)`,
        type: rule.type,
        timestamp: now.toISOString(),
        resolved: false,
      };

      this._mockDefects.push(defect);
      newDefects.push(defect);

      logger.log(
        "DEBUG",
        "DB",
        `Mock 불량 생성: ${defect.code} - ${defect.name}`
      );
    }

    return newDefects;
  }

  /**
   * 모든 불량 이력을 조회합니다.
   * Mock 모드에서는 _mockDefects 배열 반환
   * 실제 모드에서는 Oracle DB 불량 반환
   *
   * @returns 전체 불량 배열
   */
  async getAllDefectsAsync(): Promise<Defect[]> {
    if (this.mockMode) {
      return this._mockDefects;
    } else {
      // Oracle DB에서 조회 (비동기)
      return await this.queryFromOracle();
    }
  }

  /**
   * 모든 불량 이력을 조회합니다. (동기 버전)
   * Mock 모드에서만 지원되며, 실제 모드는 빈 배열 반환
   *
   * @returns 전체 불량 배열
   */
  getAllDefects(): Defect[] {
    if (this.mockMode) {
      return this._mockDefects;
    } else {
      // 동기 함수이므로 실제 DB 조회 불가
      // getAllDefectsAsync()를 사용하거나 API 층에서 비동기 처리
      return [];
    }
  }

  /**
   * 불양을 해결 처리합니다.
   *
   * Mock 모드: 메모리에서 resolved 속성 업데이트
   * 실제 모드: Oracle DB에서 NG_RELEASE_YN = 'Y' 업데이트
   *
   * @param defectIds - 해결할 불양 ID 배열 (ROWID)
   * @param reason - 해결 사유
   * @returns 성공 여부
   */
  async resolveDefectsAsync(
    defectIds: string[],
    reason: string
  ): Promise<boolean> {
    if (defectIds.length === 0) {
      logger.log("WARN", "DB", "해결할 불양 ID가 없습니다.");
      return false;
    }

    if (this.mockMode) {
      // ⭐ Mock 모드: 메모리에서 resolved 속성 업데이트
      for (const id of defectIds) {
        const defect = this._mockDefects.find((d) => d.id === id);
        if (defect) {
          defect.resolved = true;
        }
      }

      logger.log(
        "INFO",
        "DB",
        `[Mock] 불양 ${defectIds.length}개 해결 처리됨 (사유: ${reason})`
      );

      return true;
    } else {
      // ⭐ 실제 모드: Oracle DB에서 업데이트
      return await this.updateDefectsInOracle(defectIds, reason);
    }
  }

  /**
   * Oracle DB에서 ICOM_RECIEVE_DATA_NG 테이블의 NG_RELEASE_YN을 'Y'로 업데이트합니다.
   *
   * 동작:
   * ICOM_RECIEVE_DATA_NG의 NG_RELEASE_YN = 'Y' 업데이트 (이미 존재하는 테이블만 사용)
   *
   * 쿼리:
   * UPDATE ICOM_RECIEVE_DATA_NG
   * SET NG_RELEASE_YN = 'Y',
   *     RELEASE_TIME = SYSDATE
   * WHERE ROWID IN (...)
   *
   * @param defectIds - 불양의 ROWID 배열
   * @param reason - 조치 사유 (로그용)
   * @returns 업데이트 성공 여부
   */
  private async updateDefectsInOracle(
    defectIds: string[],
    reason: string
  ): Promise<boolean> {
    let connection = null;
    try {
      connection = await this.connectToOracle();

      // ROWID를 IN 절에 맞도록 변환
      // ROWID는 문자열이므로 따옴표로 감싸야 함
      const rowidList = defectIds
        .map((id) => `'${id.replace(/'/g, "''")}'`)
        .join(",");

      // ⭐ 불양 해결 처리: NG_RELEASE_YN = 'Y' 업데이트
      const updateQuery = `
        UPDATE "INFINITY21_PIMMES"."ICOM_RECIEVE_DATA_NG"
        SET NG_RELEASE_YN = 'Y',
            RELEASE_TIME = SYSDATE
        WHERE ROWID IN (${rowidList})
      `;

      const updateResult = await connection.execute(updateQuery);
      const rowsAffected = updateResult.rowsAffected || 0;

      if (rowsAffected === 0) {
        logger.log(
          "WARN",
          "DB",
          `[Oracle] 업데이트할 불양을 찾을 수 없습니다. (요청한 ID: ${defectIds.length}개)`
        );
        return false;
      }

      // 커밋
      await connection.commit();

      logger.log(
        "INFO",
        "DB",
        `[Oracle] 불양 ${rowsAffected}개 해결 처리 완료 (사유: ${reason})`
      );

      return true;
    } catch (error) {
      logger.log("ERROR", "DB", `[Oracle] 불양 해결 처리 실패: ${error}`);

      // 롤백
      if (connection) {
        try {
          await connection.rollback();
          logger.log("INFO", "DB", `[Oracle] 롤백 완료`);
        } catch (rollbackError) {
          logger.log(
            "ERROR",
            "DB",
            `[Oracle] 롤백 중 오류 발생: ${rollbackError}`
          );
        }
      }

      return false;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (error) {
          console.error("[DB] Failed to close connection:", error);
        }
      }
    }
  }

  /**
   * 불양을 해결 처리합니다. (동기 버전 - 테스트용)
   *
   * @deprecated 비동기 버전 resolveDefectsAsync()를 사용하세요.
   * @param defectIds - 해결할 불양 ID 배열
   * @param reason - 해결 사유
   */
  resolveDefects(defectIds: string[], reason: string): void {
    logger.log(
      "INFO",
      "DB",
      `Resolving defects ${defectIds.join(", ")} with reason: ${reason}`
    );
    // Mock 모드일 때만 처리 (실제 모드는 비동기 메서드 사용)
    if (this.mockMode) {
      for (const id of defectIds) {
        const defect = this._mockDefects.find((d) => d.id === id);
        if (defect) {
          defect.resolved = true;
        }
      }
    }
  }

  /**
   * Mock 모드에서 특정 불량 코드의 모든 불량을 해소합니다.
   * (임계값에 도달해서 라인 정지를 유발한 불량만 해소)
   *
   * @param defectCode - 해소할 불량 코드
   */
  resolveMockDefectsByCode(defectCode: string): void {
    if (!this.mockMode) return;

    const removedDefects = this._mockDefects.filter(
      (d) => d.code === defectCode
    );

    this._mockDefects = this._mockDefects.filter((d) => d.code !== defectCode);

    if (removedDefects.length > 0) {
      logger.log(
        "DEBUG",
        "DB",
        `Mock 불량 자동 해소: ${defectCode} (${removedDefects.length}건)`
      );
    }
  }
}

/**
 * 전역 데이터베이스 인스턴스 (싱글톤)
 * Next.js 개발 환경에서 모듈 리로드 시 인스턴스가 초기화되는 것을 방지하기 위해
 * global 객체에 인스턴스를 저장하여 재사용합니다.
 */
const globalForDb = global as unknown as { db: Database | undefined };

export const db = globalForDb.db ?? new Database();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
