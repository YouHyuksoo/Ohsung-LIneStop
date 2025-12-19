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
import { exec } from "child_process";

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
  private asciiMode: boolean = true; // ASCII 모드 (true) / Binary 모드 (false)
  private network: number = 1; // 네트워크 번호 (기본값: 1)
  private station: number = 0; // 스테이션 번호 (기본값: 0)
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
   * ⭐ NEW: Ping 테스트를 수행합니다 (TCP 포트 연결 시도)
   * 네트워크 연결 가능 여부를 빠르게 확인합니다.
   * @returns {Promise<{success: boolean, message: string, latency?: number}>}
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
            message: `연결 타임아웃 (5초 이내 응답 없음) - IP를 확인하세요.`,
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
            failureMessage = `Ping은 되지만 포트(${this.port})가 닫혀있습니다. (ECONNREFUSED) - PLC 설정을 확인하세요.`;
          } else if (err.code === "EHOSTUNREACH") {
            failureMessage = `IP 주소(${this.ip})에 도달할 수 없습니다. (EHOSTUNREACH)`;
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
   * ⭐ NEW: ICMP Ping 테스트를 수행합니다 (시스템 Ping 명령어 사용)
   * 실제 IP 도달 가능성을 확인합니다 (TCP 포트 테스트 아님).
   * @returns {Promise<{success: boolean, message: string}>}
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
      // Windows: -n 1, Linux/Mac: -c 1
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
          // 윈도우 한글 인코딩 문제 등을 고려하여 단순 성공 메시지 반환
          // stdout 로깅은 함
          logger.log(
            "INFO",
            "PLC",
            `ICMP Ping 성공 결과: ${stdout.toString()}`
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
   * ⭐ NEW: PLC 접속 테스트를 수행합니다 (MC Protocol 초기화)
   * Ping 성공 후 실제 PLC 프로토콜 연결을 시도합니다.
   * @returns {Promise<{success: boolean, message: string, version?: string}>}
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

    if (!MCProtocol) {
      const message = `mcprotocol 라이브러리가 설치되지 않음`;
      logger.log("ERROR", "PLC", `🔌 접속 테스트 실패: ${message}`);
      return { success: false, message };
    }

    // 설정 다시 로드하여 최신 값 사용
    this.loadSettings();
    logger.log(
      "DEBUG",
      "PLC",
      `접속 테스트 시작 - IP: ${this.ip}, Port: ${this.port}, ASCII: ${this.asciiMode}, Net: ${this.network}, Stn: ${this.station}, 주소: ${this.address}`
    );

    try {
      const testClient = new MCProtocol();

      // 1단계: 연결만 수행 (메서드 검증 없음)
      const connectResult = await new Promise<{
        success: boolean;
        message: string;
      }>((resolve) => {
        const timeout = setTimeout(() => {
          resolve({
            success: false,
            message: `접속 타임아웃 (10초 이내 응답 없음)`,
          });
        }, 10000);

        testClient.initiateConnection(
          {
            host: this.ip,
            port: this.port,
            ascii: this.asciiMode,  // 설정에서 읽은 모드 사용
            octalInputOutput: true,  // X/Y 주소 8진법 자동 변환
            network: this.network,  // 네트워크 번호
            station: this.station,  // 스테이션 번호
          },
          (err: any) => {
            clearTimeout(timeout);
            if (err) {
              resolve({
                success: false,
                message: `MC Protocol 초기화 실패: ${err.message || err}`,
              });
            } else {
              resolve({
                success: true,
                message: `연결 성공 (${this.asciiMode ? "ASCII" : "Binary"} 모드, Net:${this.network}, Stn:${this.station})`,
              });
            }
          }
        );
      });

      if (!connectResult.success) {
        logger.log("WARN", "PLC", `🔌 ${connectResult.message}`);
        return {
          success: false,
          message: connectResult.message,
        };
      }

      // 2단계: 연결 후 약간의 딜레이 추가 (안정화 대기)
      await new Promise((res) => setTimeout(res, 500));

      // 3단계: 데이터 읽기로 검증
      const readResult = await new Promise<{
        success: boolean;
        message: string;
      }>((resolve) => {
        // 읽기 타임아웃 설정
        const readTimeout = setTimeout(() => {
          resolve({
            success: false,
            message: `데이터 읽기 타임아웃 (5초 이내 응답 없음) - ASCII/Binary 모드를 확인하세요`,
          });
        }, 5000);

        try {
          // mcprotocol 라이브러리는 addItems + readAllItems 패턴 사용
          testClient.addItems(this.address);

          testClient.readAllItems((qualityBad: any, values: any) => {
            clearTimeout(readTimeout);

            // qualityBad는 boolean (ANY 데이터의 품질이 나쁜지 여부)
            // values는 읽은 데이터 객체
            logger.log("DEBUG", "PLC", `readAllItems 결과 - qualityBad: ${qualityBad}, values: ${JSON.stringify(values)}`);

            if (!values || Object.keys(values).length === 0) {
              resolve({
                success: false,
                message: `PLC에서 데이터를 읽을 수 없습니다 (비어있음) - ASCII/Binary 모드를 확인하세요`,
              });
            } else if (qualityBad === true) {
              // 데이터 품질이 나쁨 - 실패로 처리 (오류가 발생한 것임)
              resolve({
                success: false,
                message: `PLC 데이터 품질 불량 (qualityBad=true) - ASCII/Binary 모드를 확인하세요`,
              });
            } else {
              // 실제 값 로깅
              const readValue = values[this.address];
              logger.log("DEBUG", "PLC", `PLC 데이터 읽기 성공: ${this.address} = ${JSON.stringify(readValue)}`);
              resolve({
                success: true,
                message: `PLC 접속 성공`,
              });
            }
          });
        } catch (ex) {
          clearTimeout(readTimeout);
          resolve({
            success: false,
            message: `데이터 읽기 중 예외: ${ex}`,
          });
        }
      });

      const connectionResult = {
        success: readResult.success,
        message: readResult.success
          ? `PLC 접속 성공 (${this.ip}:${this.port}, 주소: ${this.address})`
          : readResult.message,
        version: readResult.success ? "MC Protocol 3E" : undefined,
      };

      logger.log(
        connectionResult.success ? "INFO" : "WARN",
        "PLC",
        `🔌 ${connectionResult.message}`
      );
      return connectionResult;
    } catch (error) {
      logger.log("ERROR", "PLC", `접속 테스트 중 예외 발생: ${error}`);
      return { success: false, message: `예외: ${error}` };
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

    if (!MCProtocol) {
      logger.log(
        "ERROR",
        "PLC",
        "mcprotocol 라이브러리가 설치되지 않았습니다."
      );
      return;
    }

    if (this.isConnected) return;

    logger.log(
      "DEBUG",
      "PLC",
      `PLC 연결 시작 - IP: ${this.ip}, Port: ${this.port}, ASCII: ${this.asciiMode}`
    );

    try {
      this.client = new MCProtocol();

      // Callback 방식을 Promise로 변환
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("연결 타임아웃 (10초)"));
        }, 10000);

        this.client.initiateConnection(
          {
            host: this.ip,
            port: this.port,
            ascii: this.asciiMode,  // 설정에서 읽은 모드 사용
            octalInputOutput: true,  // X/Y 주소 8진법 자동 변환
            network: this.network,  // 네트워크 번호
            station: this.station,  // 스테이션 번호
          },
          (err: any) => {
            clearTimeout(timeout);
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });

      this.isConnected = true;
      logger.log(
        "INFO",
        "PLC",
        `PLC 연결 성공 (${this.ip}:${this.port}, 주소: ${this.address}, ${this.asciiMode ? "ASCII" : "Binary"} 모드, Net:${this.network}, Stn:${this.station})`
      );
    } catch (error) {
      this.isConnected = false;
      logger.log("ERROR", "PLC", `PLC 연결 실패: ${error}`);
      // throw error; // 연결 실패 시 로그만 남김
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
      if (!this.isConnected) return "RUNNING";
    }

    try {
      // mcprotocol 라이브러리는 addItems + readAllItems 패턴 사용
      const values = await new Promise<Record<string, any>>((resolve, reject) => {
        this.client.addItems(this.address);

        this.client.readAllItems((_qualityBad: any, data: any) => {
          // _qualityBad는 boolean (데이터 품질 - 사용하지 않음)
          // data는 읽은 값들의 객체
          if (!data) reject(new Error("No data returned"));
          else resolve(data);
        });
      });

      // values는 { [address]: value } 형태
      const statusValue = values[this.address];
      if (Array.isArray(statusValue)) {
        // 배열인 경우 첫 번째 요소 사용
        switch (statusValue[0]) {
          case PLC_VALUES.STOPPED:
            return "STOPPED";
          case PLC_VALUES.WARNING:
            return "WARNING";
          default:
            return "RUNNING";
        }
      } else {
        // 단일 값인 경우
        switch (statusValue) {
          case PLC_VALUES.STOPPED:
            return "STOPPED";
          case PLC_VALUES.WARNING:
            return "WARNING";
          default:
            return "RUNNING";
        }
      }
    } catch (error) {
      logger.log("ERROR", "PLC", `상태 읽기 실패: ${error}`);
      this.isConnected = false;
      return "RUNNING";
    }
  }

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
      // mcprotocol 라이브러리는 writeItems 사용
      // 콜백: (qualityBad, values) - qualityBad는 boolean
      await new Promise<void>((resolve, reject) => {
        let callbackExecuted = false;

        // 타임아웃 설정 (10초)
        const timeout = setTimeout(() => {
          if (!callbackExecuted) {
            callbackExecuted = true;
            logger.log("WARN", "PLC", `라인 정지 명령 타임아웃 (10초 응답 없음)`);
            reject(new Error(`stopLine timeout`));
          }
        }, 10000);

        try {
          // 값을 배열로 감싸서 전송 (mcprotocol 호환성)
          this.client.writeItems(
            this.address,
            [PLC_VALUES.STOPPED],
            (_qualityBad: any, _values: any) => {
              if (!callbackExecuted) {
                callbackExecuted = true;
                clearTimeout(timeout);
                resolve();
              }
            }
          );
        } catch (err) {
          if (!callbackExecuted) {
            callbackExecuted = true;
            clearTimeout(timeout);
            reject(err);
          }
        }
      });
    } catch (error) {
      logger.log("ERROR", "PLC", `정지 명령 전송 실패: ${error}`);
    }
  }

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
      // mcprotocol 라이브러리는 writeItems 사용
      // 콜백: (qualityBad, values) - qualityBad는 boolean
      await new Promise<void>((resolve, reject) => {
        let callbackExecuted = false;

        // 타임아웃 설정 (10초)
        const timeout = setTimeout(() => {
          if (!callbackExecuted) {
            callbackExecuted = true;
            logger.log("WARN", "PLC", `라인 경고 명령 타임아웃 (10초 응답 없음)`);
            reject(new Error(`warnLine timeout`));
          }
        }, 10000);

        try {
          // 값을 배열로 감싸서 전송 (mcprotocol 호환성)
          this.client.writeItems(
            this.address,
            [PLC_VALUES.WARNING],
            (_qualityBad: any, _values: any) => {
              if (!callbackExecuted) {
                callbackExecuted = true;
                clearTimeout(timeout);
                resolve();
              }
            }
          );
        } catch (err) {
          if (!callbackExecuted) {
            callbackExecuted = true;
            clearTimeout(timeout);
            reject(err);
          }
        }
      });
    } catch (error) {
      logger.log("ERROR", "PLC", `경고 명령 전송 실패: ${error}`);
    }
  }

  async resetLine(): Promise<void> {
    logger.log("INFO", "PLC", `✅ 라인 재가동 명령 전송 (${this.address} = 0)`);
    this._stopReason = "";

    if (this.mockMode) {
      this.currentState = PLC_VALUES.RUNNING;
      return;
    }

    if (!this.isConnected) await this.connect();

    try {
      // mcprotocol 라이브러리는 writeItems 사용
      // 콜백: (qualityBad, values) - qualityBad는 boolean
      await new Promise<void>((resolve, reject) => {
        let callbackExecuted = false;

        // 타임아웃 설정 (10초)
        const timeout = setTimeout(() => {
          if (!callbackExecuted) {
            callbackExecuted = true;
            logger.log("WARN", "PLC", `라인 재가동 명령 타임아웃 (10초 응답 없음)`);
            reject(new Error(`resetLine timeout`));
          }
        }, 10000);

        try {
          // 값을 배열로 감싸서 전송 (mcprotocol 호환성)
          this.client.writeItems(
            this.address,
            [PLC_VALUES.RUNNING],
            (_qualityBad: any, _values: any) => {
              if (!callbackExecuted) {
                callbackExecuted = true;
                clearTimeout(timeout);
                resolve();
              }
            }
          );
        } catch (err) {
          if (!callbackExecuted) {
            callbackExecuted = true;
            clearTimeout(timeout);
            reject(err);
          }
        }
      });
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
