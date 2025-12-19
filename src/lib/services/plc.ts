/**
 * @file src/lib/services/plc.ts
 * @description
 * PLC(Programmable Logic Controller) 통신 인터페이스
 * melsec-connect 라이브러리를 사용한 Mitsubishi MC Protocol 통신
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
import { exec } from "child_process";

// melsec-connect 라이브러리 (CommonJS)
let PLCClient: any;
try {
  PLCClient = require("melsec-connect").PLCClient;
} catch (e) {
  console.warn(
    "[PLC] melsec-connect library not found. Running in Mock mode only."
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
 * PLC 통신 클래스 (melsec-connect 기반)
 */
class PLC {
  private mockMode: boolean = true;
  private currentState: number = PLC_VALUES.RUNNING; // 현재 상태 (0, 1, 2)
  private _stopReason: string = "";
  private ip: string = "192.168.151.27";
  private port: number = 5012;
  private address: string = "D7000"; // 제어 및 상태용 단일 주소
  private asciiMode: boolean = false; // ASCII 모드 (true) / Binary 모드 (false)
  private network: number = 1; // 네트워크 번호 (기본값: 1)
  private station: number = 0; // 스테이션 번호 (기본값: 0)
  private frame: string = "3E"; // MC Protocol 프레임 (3E/4E)
  private plcType: string = "Q"; // PLC 타입 (Q/iQ-R/L 등)
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
          if (typeof settings.plc.ascii === "boolean") {
            this.asciiMode = settings.plc.ascii;
          }
          // 네트워크 번호 로드 (기본값: 1)
          if (typeof settings.plc.network === "number") {
            this.network = settings.plc.network;
          }
          // 스테이션 번호 로드 (기본값: 0)
          if (typeof settings.plc.station === "number") {
            this.station = settings.plc.station;
          }
          // 프레임 타입 로드 (기본값: 3E)
          if (settings.plc.frame) {
            this.frame = settings.plc.frame;
          }
          // PLC 타입 로드 (기본값: Q)
          if (settings.plc.plcType) {
            this.plcType = settings.plc.plcType;
          }
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
   * 설정 파일을 다시 로드하여 메모리의 싱글톤 인스턴스를 업데이트합니다.
   */
  reloadSettings(): void {
    this.loadSettings();
  }

  /**
   * Ping 테스트를 수행합니다 (TCP 포트 연결 시도)
   */
  async testPing(): Promise<{
    success: boolean;
    message: string;
    latency?: number;
  }> {
    if (this.mockMode) {
      const message = `Mock 모드 상태 - Ping 테스트 불필요`;
      logger.log("INFO", "PLC", `🔍 Ping 테스트: ${message}`);
      return { success: true, message, latency: 0 };
    }

    const startTime = Date.now();

    try {
      const net = require("net");
      const socket = new net.Socket();

      const pingResult = await new Promise<{
        success: boolean;
        message: string;
        latency?: number;
      }>((resolve) => {
        const timeout = setTimeout(() => {
          socket.destroy();
          resolve({
            success: false,
            message: `연결 타임아웃 (5초 이내 응답 없음)`,
          });
        }, 5000);

        socket.on("connect", () => {
          clearTimeout(timeout);
          const latency = Date.now() - startTime;
          socket.destroy();
          resolve({
            success: true,
            message: `포트 연결 성공 (${this.ip}:${this.port})`,
            latency,
          });
        });

        socket.on("error", (err: any) => {
          clearTimeout(timeout);
          let failureMessage = `연결 실패: ${err.code || err.message}`;

          if (err.code === "ECONNREFUSED") {
            failureMessage = `포트(${this.port})가 닫혀있습니다. (ECONNREFUSED)`;
          } else if (err.code === "EHOSTUNREACH") {
            failureMessage = `IP 주소(${this.ip})에 도달할 수 없습니다.`;
          }

          resolve({
            success: false,
            message: failureMessage,
          });
        });

        socket.connect(this.port, this.ip);
      });

      logger.log(
        pingResult.success ? "INFO" : "WARN",
        "PLC",
        `🔍 ${pingResult.message}`
      );
      return pingResult;
    } catch (error) {
      logger.log("ERROR", "PLC", `Port 테스트 중 예외 발생: ${error}`);
      return { success: false, message: `예외: ${error}` };
    }
  }

  /**
   * ICMP Ping 테스트를 수행합니다
   */
  async testIcmpPing(): Promise<{
    success: boolean;
    message: string;
  }> {
    if (this.mockMode) {
      const message = `Mock 모드 상태 - ICMP Ping 테스트 불필요`;
      logger.log("INFO", "PLC", `🔍 ICMP Ping 테스트: ${message}`);
      return { success: true, message };
    }

    return new Promise((resolve) => {
      const command =
        process.platform === "win32"
          ? `ping -n 1 ${this.ip}`
          : `ping -c 1 ${this.ip}`;

      exec(command, (error, stdout) => {
        if (error) {
          logger.log("WARN", "PLC", `ICMP Ping 실패: ${error.message}`);
          resolve({
            success: false,
            message: `ICMP Ping 실패: 대상 IP(${this.ip})에 도달할 수 없습니다.`,
          });
        } else {
          logger.log(
            "INFO",
            "PLC",
            `ICMP Ping 성공`
          );
          resolve({
            success: true,
            message: `ICMP Ping 성공 (IP: ${this.ip} 도달 가능)`,
          });
        }
      });
    });
  }

  /**
   * PLC 접속 테스트를 수행합니다 (melsec-connect 사용)
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    version?: string;
  }> {
    if (this.mockMode) {
      const message = `Mock 모드 상태 - 접속 테스트 불필요`;
      logger.log("INFO", "PLC", `🔌 접속 테스트: ${message}`);
      return { success: true, message };
    }

    if (!PLCClient) {
      const message = `melsec-connect 라이브러리가 설치되지 않음`;
      logger.log("ERROR", "PLC", `🔌 접속 테스트 실패: ${message}`);
      return { success: false, message };
    }

    // 설정 다시 로드하여 최신 값 사용
    this.loadSettings();
    logger.log(
      "DEBUG",
      "PLC",
      `접속 테스트 시작 - IP: ${this.ip}, Port: ${this.port}, ASCII: ${this.asciiMode}, Net: ${this.network}, Stn: ${this.station}, Frame: ${this.frame}, 주소: ${this.address}`
    );

    try {
      // melsec-connect PLCClient 설정
      const testClient = new PLCClient({
        host: this.ip,
        port: this.port,
        ascii: this.asciiMode,
        frame: this.frame,
        plcType: this.plcType,
        network: this.network,
        PLCStation: this.station,
        timeout: 10000,
      });

      // 연결 시도
      await testClient.connect();

      // 데이터 읽기 테스트
      const readResult = await testClient.read([{ name: this.address }]);

      // 연결 종료
      await testClient.disconnect();

      if (readResult.success) {
        const value = readResult.results[this.address]?.value;
        logger.log(
          "DEBUG",
          "PLC",
          `PLC 데이터 읽기 성공: ${this.address} = ${value}`
        );

        const connectionResult = {
          success: true,
          message: `PLC 접속 성공 (${this.ip}:${this.port}, Net:${this.network}, Stn:${this.station}, 주소: ${this.address})`,
          version: `MC Protocol ${this.frame}`,
        };

        logger.log("INFO", "PLC", `🔌 ${connectionResult.message}`);
        return connectionResult;
      } else {
        const errorMsg = `데이터 읽기 실패`;
        logger.log("WARN", "PLC", `🔌 ${errorMsg}`);
        return { success: false, message: errorMsg };
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      logger.log("ERROR", "PLC", `접속 테스트 중 예외 발생: ${errorMsg}`);
      return { success: false, message: `예외: ${errorMsg}` };
    }
  }

  /**
   * PLC에 연결합니다.
   */
  async connect(): Promise<void> {
    // 설정 다시 로드하여 최신 값 사용
    this.loadSettings();

    if (this.mockMode) {
      this.isConnected = true;
      return;
    }

    if (!PLCClient) {
      logger.log(
        "ERROR",
        "PLC",
        "melsec-connect 라이브러리가 설치되지 않았습니다."
      );
      return;
    }

    if (this.isConnected && this.client) return;

    logger.log(
      "DEBUG",
      "PLC",
      `PLC 연결 시작 - IP: ${this.ip}, Port: ${this.port}, ASCII: ${this.asciiMode}, Net: ${this.network}, Stn: ${this.station}`
    );

    try {
      // melsec-connect PLCClient 생성
      this.client = new PLCClient({
        host: this.ip,
        port: this.port,
        ascii: this.asciiMode,
        frame: this.frame,
        plcType: this.plcType,
        network: this.network,
        PLCStation: this.station,
        timeout: 10000,
      });

      await this.client.connect();

      this.isConnected = true;
      logger.log(
        "INFO",
        "PLC",
        `PLC 연결 성공 (${this.ip}:${this.port}, ${this.asciiMode ? "ASCII" : "Binary"} 모드, Net:${this.network}, Stn:${this.station})`
      );
    } catch (error) {
      this.isConnected = false;
      logger.log("ERROR", "PLC", `PLC 연결 실패: ${error}`);
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
   * PLC 상태를 읽습니다.
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

    if (!this.isConnected || !this.client) {
      await this.connect();
      if (!this.isConnected) return "RUNNING";
    }

    try {
      const result = await this.client.read([{ name: this.address }]);

      if (result.success && result.results[this.address]) {
        const statusValue = result.results[this.address].value;

        switch (statusValue) {
          case PLC_VALUES.STOPPED:
            return "STOPPED";
          case PLC_VALUES.WARNING:
            return "WARNING";
          default:
            return "RUNNING";
        }
      }

      return "RUNNING";
    } catch (error) {
      logger.log("ERROR", "PLC", `상태 읽기 실패: ${error}`);
      this.isConnected = false;
      return "RUNNING";
    }
  }

  /**
   * 라인 정지 명령을 전송합니다.
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

    if (!this.isConnected || !this.client) await this.connect();

    try {
      await this.client.write([
        { name: this.address, value: PLC_VALUES.STOPPED },
      ]);
    } catch (error) {
      logger.log("ERROR", "PLC", `정지 명령 전송 실패: ${error}`);
    }
  }

  /**
   * 라인 경고(알람) 명령을 전송합니다.
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

    if (!this.isConnected || !this.client) await this.connect();

    try {
      await this.client.write([
        { name: this.address, value: PLC_VALUES.WARNING },
      ]);
    } catch (error) {
      logger.log("ERROR", "PLC", `경고 명령 전송 실패: ${error}`);
    }
  }

  /**
   * 라인 재가동 명령을 전송합니다.
   */
  async resetLine(): Promise<void> {
    logger.log("INFO", "PLC", `✅ 라인 재가동 명령 전송 (${this.address} = 0)`);
    this._stopReason = "";

    if (this.mockMode) {
      this.currentState = PLC_VALUES.RUNNING;
      return;
    }

    if (!this.isConnected || !this.client) await this.connect();

    try {
      await this.client.write([
        { name: this.address, value: PLC_VALUES.RUNNING },
      ]);
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
