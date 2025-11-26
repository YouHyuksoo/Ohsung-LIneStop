/**
 * @file src/lib/services/plc.ts
 * @description
 * PLC(Programmable Logic Controller) 통신 인터페이스
 *
 * 주요 기능:
 * - 라인 상태 읽기 (RUNNING/STOPPED)
 * - 라인 정지 명령 전송
 * - 라인 재가동 명령 전송
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
 * // 라인 상태 확인
 * const status = plc.readStatus(); // 'RUNNING' or 'STOPPED'
 *
 * // 라인 정지
 * plc.stopLine('불량 임계값 초과');
 *
 * // 라인 재가동
 * plc.resetLine();
 */

import { logger } from "./logger";
import fs from "fs";
import path from "path";

/**
 * PLC 통신 클래스
 */
class PLC {
  private mockMode: boolean = true;
  private isStopped: boolean = false;
  private _stopReason: string = "";
  private ip: string = "192.168.0.1";
  private port: number = 5000;
  private address: string = "D100";
  private settingsFile: string;

  constructor() {
    this.settingsFile = path.join(process.cwd(), "settings.json");
    this.loadSettings();

    if (this.mockMode) {
      console.log(
        `[PLC] Connected to Mock PLC at ${this.ip}:${this.port} (Address: ${this.address})`
      );
      logger.log("INFO", "PLC", `Mock PLC 연결됨 (${this.ip}:${this.port})`);
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
   * 정지 사유를 반환합니다.
   */
  get stopReason(): string {
    return this._stopReason;
  }

  /**
   * 라인 상태를 읽어옵니다.
   *
   * @returns 'RUNNING' 또는 'STOPPED'
   */
  readStatus(): "RUNNING" | "STOPPED" {
    if (this.mockMode) {
      return this.isStopped ? "STOPPED" : "RUNNING";
    }
    // TODO: 실제 PLC에서 상태 읽기 구현
    // Modbus/TCP 또는 전용 프로토콜 사용
    // this.ip, this.port, this.address 사용
    return "RUNNING";
  }

  /**
   * 라인 정지 명령을 전송합니다.
   *
   * @param reason - 정지 사유
   */
  stopLine(reason: string): void {
    console.log(`[PLC] !!! STOP LINE COMMAND SENT !!! Reason: ${reason}`);
    logger.log("ERROR", "PLC", `🚨 라인 정지 명령 전송! 사유: ${reason}`);
    this.isStopped = true;
    this._stopReason = reason;
    // TODO: 실제 PLC에 정지 신호 전송
    // 예: PLC 메모리 this.address에 1을 씀
  }

  /**
   * 라인 재가동 명령을 전송합니다.
   * 정지 상태를 해제하고 라인을 다시 시작합니다.
   */
  resetLine(): void {
    console.log("[PLC] Reset Line Command Sent");
    logger.log("INFO", "PLC", "✅ 라인 재가동 명령 전송");
    this.isStopped = false;
    this._stopReason = "";
    // TODO: 실제 PLC에 재가동 신호 전송
    // 예: PLC 메모리 this.address에 0을 씀
  }
}

/**
 * 전역 PLC 인스턴스
 * 애플리케이션 전체에서 하나의 PLC 연결을 공유합니다.
 */
export const plc = new PLC();
