/**
 * @file src/lib/services/plc.ts
 * @description
 * PLC(Programmable Logic Controller) 통신 인터페이스
 * Mitsubishi MC Protocol (3E/4E Frame) 지원
 *
 * 주요 기능:
 * - 라인 상태 읽기 (RUNNING/STOPPED/WARNING)
 * - 라인 정지 명령 전송
 * - 라인 경고(알람) 명령 전송
 * - 라인 재가동 명령 전송
 *
 * 3단계 제어 모델:
 * - 하나의 비트 주소(예: D7000)를 사용하여 제어 및 상태 확인
 * - Read/Write 0 : 해지 (라인 가동 - RUNNING)
 * - Read/Write 1 : 정지 (라인 정지 - STOPPED)
 * - Read/Write 2 : 알람 (경고 - WARNING)
 *
 * Mock 모드:
 * - 실제 PLC 없이도 테스트 가능
 * - 상태를 메모리에 저장하여 시뮬레이션
 *
 * 초보자 가이드:
 * 1. **mockMode**: true로 설정하면 실제 PLC 없이 테스트 가능
 * 2. **currentState**: 현재 PLC 상태 (0, 1, 2)
 * 3. **stopReason**: 정지/경고 사유를 저장
 *
 * @example
 * import { plc } from '@/lib/services/plc';
 *
 * // 연결
 * await plc.connect();
 *
 * // 라인 상태 확인
 * const status = await plc.readStatus(); // 'RUNNING' | 'STOPPED' | 'WARNING'
 *
 * // 라인 정지 (값 1 쓰기)
 * await plc.stopLine('불량 임계값 초과');
 *
 * // 라인 경고 (값 2 쓰기)
 * await plc.warnLine('불량 감지됨');
 *
 * // 라인 재가동 (값 0 쓰기)
 * await plc.resetLine();
 */

import { logger } from "./logger";
import fs from "fs";
import path from "path";

// MC Protocol 라이브러리 (CommonJS)
let MCProtocol: any;
try {
  MCProtocol = require("mcprotocol");
} catch (e) {
  console.warn(
    "[PLC] mcprotocol library not found. Running in Mock mode only."
  );
}

/**
 * PLC 상태값 정의
 * - 0: 해지 (라인 가동)
 * - 1: 정지 (라인 정지)
 * - 2: 알람 (경고)
 */
export const PLC_VALUES = {
  RUNNING: 0, // 해지 (라인 가동)
  STOPPED: 1, // 정지 (라인 정지)
  WARNING: 2, // 알람 (경고)
} as const;

/**
 * PLC 통신 클래스
 */
class PLC {
  private mockMode: boolean = true;
  private currentState: number = PLC_VALUES.RUNNING; // 현재 상태 (0, 1, 2)
  private _stopReason: string = "";
  private ip: string = "192.168.151.27";
  private port: number = 5012;
  private address: string = "D7000"; // 제어 및 상태용 단일 주소
  private settingsFile: string;
  private client: any = null;
  private isConnected: boolean = false;

  constructor() {
    this.settingsFile = path.join(process.cwd(), "settings.json");
    this.loadSettings();

    if (this.mockMode) {
      logger.log(
        "INFO",
        "PLC",
        `Mock PLC 모드로 초기화됨 (${this.ip}:${this.port}, 주소: ${this.address})`
      );
    }
  }

  /**
   * 설정 파일에서 PLC 설정을 로드합니다.
   */
  private loadSettings(): void {
    try {
      if (fs.existsSync(this.settingsFile)) {
        const data = fs.readFileSync(this.settingsFile, "utf-8");
        const settings = JSON.parse(data);

        if (settings.plc) {
          this.ip = settings.plc.ip || this.ip;
          this.port = settings.plc.port || this.port;
          this.address = settings.plc.address || this.address;
        }

        if (settings.mock && typeof settings.mock.plc === "boolean") {
          this.mockMode = settings.mock.plc;
        }
      }
    } catch (error) {
      console.error("[PLC] Failed to load settings:", error);
    }
  }

  /**
   * ⭐ NEW: 설정 파일을 다시 로드하여 메모리의 싱글톤 인스턴스를 업데이트합니다.
   * 설정 변경 후 즉시 반영하기 위해 사용합니다.
   */
  reloadSettings(): void {
    this.loadSettings();
  }

  /**
   * PLC에 연결합니다.
   */
  async connect(): Promise<void> {
    if (this.mockMode) {
      this.isConnected = true;
      return;
    }

    if (!MCProtocol) {
      logger.log(
        "ERROR",
        "PLC",
        "mcprotocol 라이브러리가 설치되지 않았습니다."
      );
      return;
    }

    if (this.isConnected) return;

    try {
      this.client = new MCProtocol();

      // ⭐ 2초 타임아웃 적용
      const connectPromise = this.client.initiateConnection({
        host: this.ip,
        port: this.port,
        ascii: false, // Binary 모드 사용
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Connection timed out (2s)")), 2000);
      });

      await Promise.race([connectPromise, timeoutPromise]);

      this.isConnected = true;
      logger.log(
        "INFO",
        "PLC",
        `PLC 연결 성공 (${this.ip}:${this.port}, 주소: ${this.address})`
      );
    } catch (error) {
      this.isConnected = false;
      logger.log("ERROR", "PLC", `PLC 연결 실패: ${error}`);
      // throw error; // 연결 실패는 로그만 남기고 서비스는 계속 진행
    }
  }

  /**
   * 정지/경고 사유를 반환합니다.
   */
  get stopReason(): string {
    return this._stopReason;
  }

  /**
   * Mock 모드 여부를 반환합니다.
   */
  get isMockMode(): boolean {
    return this.mockMode;
  }

  /**
   * 현재 연결 상태를 반환합니다.
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * 라인 상태를 읽어옵니다.
   *
   * 값 정의:
   * - 0: 해지 (RUNNING)
   * - 1: 정지 (STOPPED)
   * - 2: 알람 (WARNING)
   *
   * @returns 'RUNNING' | 'STOPPED' | 'WARNING'
   */
  async readStatus(): Promise<"RUNNING" | "STOPPED" | "WARNING"> {
    if (this.mockMode) {
      switch (this.currentState) {
        case PLC_VALUES.STOPPED:
          return "STOPPED";
        case PLC_VALUES.WARNING:
          return "WARNING";
        default:
          return "RUNNING";
      }
    }

    if (!this.isConnected) {
      await this.connect();
      if (!this.isConnected) return "RUNNING"; // 연결 실패 시 기본값
    }

    try {
      // 단일 주소 값 읽기
      const values = await this.client.readPLCDevices(this.address, 1);
      const statusValue = values[0];

      // 값에 따른 상태 반환
      switch (statusValue) {
        case PLC_VALUES.STOPPED:
          return "STOPPED";
        case PLC_VALUES.WARNING:
          return "WARNING";
        default:
          return "RUNNING";
      }
    } catch (error) {
      logger.log("ERROR", "PLC", `상태 읽기 실패: ${error}`);
      this.isConnected = false;
      return "RUNNING";
    }
  }

  /**
   * 라인 정지 명령을 전송합니다. (값 1 쓰기)
   *
   * 조건: 불량 카운트 >= 임계값
   *
   * @param reason - 정지 사유
   */
  async stopLine(reason: string): Promise<void> {
    logger.log(
      "ERROR",
      "PLC",
      `🚨 라인 정지 명령 전송! (${this.address} = 1) 사유: ${reason}`
    );
    this._stopReason = reason;

    if (this.mockMode) {
      this.currentState = PLC_VALUES.STOPPED;
      return;
    }

    if (!this.isConnected) await this.connect();

    try {
      // 해당 주소에 1 쓰기 (정지)
      await this.client.setPLCDevices(this.address, [PLC_VALUES.STOPPED]);
    } catch (error) {
      logger.log("ERROR", "PLC", `정지 명령 전송 실패: ${error}`);
    }
  }

  /**
   * 라인 경고(알람) 명령을 전송합니다. (값 2 쓰기)
   *
   * 조건: 0 < 불량 카운트 < 임계값
   *
   * @param reason - 경고 사유
   */
  async warnLine(reason: string): Promise<void> {
    logger.log(
      "WARN",
      "PLC",
      `⚠️ 라인 경고(알람) 명령 전송! (${this.address} = 2) 사유: ${reason}`
    );
    this._stopReason = reason;

    if (this.mockMode) {
      this.currentState = PLC_VALUES.WARNING;
      return;
    }

    if (!this.isConnected) await this.connect();

    try {
      // 해당 주소에 2 쓰기 (경고/알람)
      await this.client.setPLCDevices(this.address, [PLC_VALUES.WARNING]);
    } catch (error) {
      logger.log("ERROR", "PLC", `경고 명령 전송 실패: ${error}`);
    }
  }

  /**
   * 라인 재가동 명령을 전송합니다. (값 0 쓰기)
   * 정지/경고 상태를 해제하고 라인을 다시 시작합니다.
   *
   * 조건: 불량 카운트 == 0
   */
  async resetLine(): Promise<void> {
    logger.log("INFO", "PLC", `✅ 라인 재가동 명령 전송 (${this.address} = 0)`);
    this._stopReason = "";

    if (this.mockMode) {
      this.currentState = PLC_VALUES.RUNNING;
      return;
    }

    if (!this.isConnected) await this.connect();

    try {
      // 해당 주소에 0 쓰기 (해지/가동)
      await this.client.setPLCDevices(this.address, [PLC_VALUES.RUNNING]);
    } catch (error) {
      logger.log("ERROR", "PLC", `재가동 명령 전송 실패: ${error}`);
    }
  }
}

/**
 * 전역 PLC 인스턴스 (싱글톤)
 */
const globalForPlc = global as unknown as { plc: PLC | undefined };

export const plc = globalForPlc.plc ?? new PLC();

if (process.env.NODE_ENV !== "production") {
  globalForPlc.plc = plc;
}
