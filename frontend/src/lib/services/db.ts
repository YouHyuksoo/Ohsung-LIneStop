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
 *    - Oracle DB 연동 준비
 *    - Mock 모드에서 랜덤 불량 생성
 *
 * Mock 모드:
 * - 실제 DB 없이도 테스트 가능
 * - 10% 확률로 랜덤 불량 생성
 * - 활성화된 규칙 중에서 랜덤 선택
 *
 * 초보자 가이드:
 * 1. **rules**: 불량 규칙을 저장하는 Map 객체
 * 2. **mockDefects**: Mock 모드에서 생성된 불량 리스트
 * 3. **mockMode**: true로 설정하면 실제 DB 없이 테스트 가능
 *
 * @example
 * import { db } from '@/lib/services/db';
 *
 * // 규칙 추가
 * db.saveRule({ code: 'NG001', name: '스크래치', threshold: 3, is_active: true });
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
 * 데이터베이스 클래스
 */
class Database {
  private rulesFile: string;
  private settingsFile: string;
  private rules: Map<string, DefectRule> = new Map();
  private _mockDefects: Defect[] = [];
  private mockMode: boolean = true;

  // DB Connection Details
  private dbConfig = {
    host: "localhost",
    port: 1521,
    service: "xe",
    user: "system",
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

        if (settings.mock && typeof settings.mock.db === "boolean") {
          this.mockMode = settings.mock.db;
        }

        if (!this.mockMode) {
          logger.log(
            "INFO",
            "DB",
            `Oracle DB 설정 로드됨 (${this.dbConfig.host}:${this.dbConfig.port}/${this.dbConfig.service})`
          );
        }
      }
    } catch (error) {
      console.error("[DB] Failed to load settings:", error);
    }
  }

  /**
   * Mock 불량 리스트를 반환합니다.
   */
  get mockDefects(): Defect[] {
    return this._mockDefects;
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
   * @param secondsLookback - 조회할 과거 시간(초)
   * @returns 불량 배열
   */
  fetchRecentDefects(secondsLookback: number = 10): Defect[] {
    if (this.mockMode) {
      return this.generateMockDefects();
    } else {
      // TODO: 실제 Oracle DB 쿼리 구현
      // this.dbConfig.host, port, service, user, password 사용
      // oracledb 라이브러리 사용하여 연결 및 쿼리
      return [];
    }
  }

  /**
   * 테스트용 랜덤 불량을 생성합니다.
   * 활성화된 규칙 중에서 10% 확률로 불량 발생
   *
   * @returns 생성된 불량 배열
   */
  private generateMockDefects(): Defect[] {
    const newDefects: Defect[] = [];
    const now = new Date();

    // 10% 확률로 불량 생성
    if (Math.random() < 0.1) {
      const activeRules = Array.from(this.rules.values()).filter(
        (r) => r.is_active
      );

      if (activeRules.length > 0) {
        const rule =
          activeRules[Math.floor(Math.random() * activeRules.length)];
        const defect: Defect = {
          id: `D-${Date.now()}`,
          code: rule.code,
          name: rule.name,
          timestamp: now.toISOString(),
          resolved: false,
        };

        this._mockDefects.push(defect);
        newDefects.push(defect);
        console.log(
          `[MockDB] Generated Defect: ${defect.code} - ${defect.name}`
        );
        logger.log(
          "DEBUG",
          "DB",
          `Mock 불량 생성: ${defect.code} - ${defect.name}`
        );
      }
    }

    return newDefects;
  }

  /**
   * 불량을 해결 처리합니다.
   *
   * @param defectIds - 해결할 불량 ID 배열
   * @param reason - 해결 사유
   */
  resolveDefects(defectIds: string[], reason: string): void {
    console.log(
      `[DB] Resolving defects ${defectIds.join(", ")} with reason: ${reason}`
    );
    // TODO: 실제 DB 업데이트
  }
}

/**
 * 전역 데이터베이스 인스턴스
 */
export const db = new Database();
