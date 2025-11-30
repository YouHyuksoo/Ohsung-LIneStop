/**
 * @file src/lib/services/plc.ts
 * @description
 * PLC(Programmable Logic Controller) 통신 인터페이스
 * Mitsubishi MC Protocol (3E/4E Frame) 지원
 *
 * 주요 기능:
 * - 라인 상태 읽기 (RUNNING/STOPPED)
 * - 라인 정지 명령 전송
 * - 라인 재가동 명령 전송
 *
 * 단일 주소 제어 모델:
 * - 하나의 비트 주소(예: M100)를 사용하여 제어 및 상태 확인
 * - Read 1 / Write 1 : 정지 (STOPPED)
 * - Read 0 / Write 0 : 가동 (RUNNING)
 *
 * Mock 모드:
 * - 실제 PLC 없이도 테스트 가능
 * - 상태를 메모리에 저장하여 시뮬레이션
 *
 * 초보자 가이드:
 * 1. **mockMode**: true로 설정하면 실제 PLC 없이 테스트 가능
 * 2. **isStopped**: 라인 정지 상태를 나타내는 플래그
 * 3. **stopReason**: 정지 사유를 저장
 *
 * @example
 * import { plc } from '@/lib/services/plc';
 *
 * // 연결
 * await plc.connect();
 *
 * // 라인 상태 확인
 * const status = await plc.readStatus(); // 'RUNNING' or 'STOPPED'
 *
 * // 라인 정지 (Bit 1 쓰기)
 * await plc.stopLine('불량 임계값 초과');
 *
 * // 라인 재가동 (Bit 0 쓰기)
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
 * PLC 통신 클래스
 */
class PLC {
  private mockMode: boolean = true;
  private isStopped: boolean = false;
  private _stopReason: string = "";
  private ip: string = "192.168.0.1";
  private port: number = 5000;
  private address: string = "M100"; // 제어 및 상태용 단일 주소
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
        `Mock PLC 모드로 초기화됨 (${this.ip}:${this.port})`
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
      await this.client.initiateConnection({
        host: this.ip,
        port: this.port,
        ascii: false, // Binary 모드 사용
      });
      this.isConnected = true;
      logger.log("INFO", "PLC", `PLC 연결 성공 (${this.ip}:${this.port})`);
    } catch (error) {
      this.isConnected = false;
      logger.log("ERROR", "PLC", `PLC 연결 실패: ${error}`);
      // throw error; // 연결 실패는 로그만 남기고 서비스는 계속 진행
    }
  }

  /**
   * 정지 사유를 반환합니다.
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
   * 라인 상태를 읽어옵니다.
   *
   * @returns 'RUNNING' (0) 또는 'STOPPED' (1)
   */
  async readStatus(): Promise<"RUNNING" | "STOPPED"> {
    if (this.mockMode) {
      return this.isStopped ? "STOPPED" : "RUNNING";
    }

    if (!this.isConnected) {
      await this.connect();
      if (!this.isConnected) return "RUNNING"; // 연결 실패 시 기본값
    }

    try {
      // 단일 주소 값 읽기
      const values = await this.client.readPLCDevices(this.address, 1);
      const statusValue = values[0];

      // 1 = 정지, 0 = 가동
      if (statusValue === 1) {
        return "STOPPED";
      } else {
        return "RUNNING";
      }
    } catch (error) {
      logger.log("ERROR", "PLC", `상태 읽기 실패: ${error}`);
      this.isConnected = false;
      return "RUNNING";
    }
  }

  /**
   * 라인 정지 명령을 전송합니다. (Bit 1 쓰기)
   *
   * @param reason - 정지 사유
   */
  async stopLine(reason: string): Promise<void> {
    logger.log("ERROR", "PLC", `🚨 라인 정지 명령 전송! 사유: ${reason}`);
    this._stopReason = reason;

    if (this.mockMode) {
      this.isStopped = true;
      return;
    }

    if (!this.isConnected) await this.connect();

    try {
      // 해당 주소에 1 쓰기
      await this.client.setPLCDevices(this.address, [1]);
    } catch (error) {
      logger.log("ERROR", "PLC", `정지 명령 전송 실패: ${error}`);
    }
  }

  /**
   * 라인 재가동 명령을 전송합니다. (Bit 0 쓰기)
   * 정지 상태를 해제하고 라인을 다시 시작합니다.
   */
  async resetLine(): Promise<void> {
    logger.log("INFO", "PLC", "✅ 라인 재가동 명령 전송");
    this._stopReason = "";

    if (this.mockMode) {
      this.isStopped = false;
      return;
    }

    if (!this.isConnected) await this.connect();

    try {
      // 해당 주소에 0 쓰기
      await this.client.setPLCDevices(this.address, [0]);
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
