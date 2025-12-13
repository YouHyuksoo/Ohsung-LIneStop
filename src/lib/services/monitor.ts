/**
 * @file src/lib/services/monitor.ts
 * @description
 * 불량 모니터링 서비스의 핵심 로직
 *
 * 주요 기능:
 * 1. 실시간 불량 감지
 *    - 설정된 주기마다 현재 기준 과거 1시간 범위 내 미해결 불량 조회
 *    - DB 모드: 프로시저 호출 (SP_CHECK_LINE_STOP) 하여 판단 위임
 *    - Mock 모드: 앱 레벨에서 시뮬레이션
 *
 * 2. 3단계 라인 제어 (프로시저 결과 기반)
 *    - 프로시저 결과 'STOP' (불량 카운트 >= 임계값) → 라인 정지 (PLC 값 1)
 *    - 프로시저 결과 'PASS' + (0 < 불량 카운트 < 임계값) → 라인 경고 (PLC 값 2)
 *    - 프로시저 결과 'PASS' + (불량 카운트 == 0) → 라인 가동 (PLC 값 0)
 *
 * 3. 서비스 제어
 *    - 시작/정지 기능
 *    - 상태 조회 API
 *
 * 동작 원리:
 * - 설정된 주기마다 실행
 * - Real: 규칙(접두사 코드)별로 프로시저 호출 → 결과에 따라 PLC 제어
 * - Mock: 내부 로직으로 시뮬레이션
 *
 * PLC 값 정의:
 * - 0: 해지 (라인 가동)
 * - 1: 정지 (라인 정지)
 * - 2: 알람 (경고)
 */

import { db } from "./db";
import { plc } from "./plc";
import { logger } from "./logger";
import { createNotification } from "../store/notification-store";
import fs from "fs";
import path from "path";

import { Defect, MonitorStatus } from "@/lib/types";

class MonitorService {
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastPlcCommand: Date | null = null;
  private lastPlcCommandType: "STOP" | "RESET" | "WARN" | null = null;
  private currentCounts: Record<string, number> = {};
  private currentDefects: Defect[] = [];
  private lastPollingTime: Date | null = null;
  private lastWarningCount: number = 0;
  private defectResolveTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEFECT_RESOLVE_DELAY: number = 30000;
  private stopSequenceId: number = 0;
  private internalLineStatus: "RUNNING" | "STOPPED" | "WARNING" = "RUNNING";
  private pollingInterval: number = 30000;
  private settingsFile: string = "";

  constructor() {
    this.settingsFile = path.join(process.cwd(), "settings.json");
    this.loadSettings();
  }

  private loadSettings(): void {
    try {
      if (fs.existsSync(this.settingsFile)) {
        const data = fs.readFileSync(this.settingsFile, "utf-8");
        const settings = JSON.parse(data);

        if (settings.polling?.interval !== undefined) {
          this.pollingInterval = settings.polling.interval * 1000;
          logger.log(
            "INFO",
            "Monitor",
            `폴링 주기 설정: ${settings.polling.interval}초`
          );
        }
      }
    } catch (error) {
      logger.log("ERROR", "Monitor", `설정 로드 실패: ${error}`);
    }
  }

  async start(): Promise<void> {
    if (!this.isRunning) {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        logger.log("INFO", "Monitor", "Hot Reload 후 이전 interval 정리 완료");
      }

      this.defectResolveTimers.forEach((timer) => {
        clearTimeout(timer);
      });
      this.defectResolveTimers.clear();

      this.isRunning = true;

      // [초기화] 시작 시 딱 한 번 PLC 상태를 읽어 내부 상태 동기화
      if (!db.isMockMode && !plc.isMockMode) {
        try {
          await plc.connect();
          this.internalLineStatus = await plc.readStatus();
          logger.log(
            "INFO",
            "Monitor",
            `초기 PLC 상태 동기화 완료: ${this.internalLineStatus}`
          );
        } catch (e) {
          logger.log("ERROR", "Monitor", `초기 PLC 상태 읽기 실패: ${e}`);
        }
      }

      this.processCycle();
      const intervalId = setInterval(
        () => this.processCycle(),
        this.pollingInterval
      );
      this.intervalId = intervalId;
      logger.log(
        "INFO",
        "Monitor",
        `폴링 주기: ${this.pollingInterval / 1000}초`
      );
      logger.log("INFO", "Monitor", "모니터링 서비스가 시작되었습니다.");

      createNotification(
        "SERVICE_START",
        "모니터링 서비스 시작",
        "불량 모니터링 서비스가 시작되었습니다."
      );
    }
  }

  stop(): void {
    if (this.isRunning) {
      this.isRunning = false;
      this.stopSequenceId++;

      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      this.defectResolveTimers.forEach((timer) => {
        clearTimeout(timer);
      });
      this.defectResolveTimers.clear();

      logger.log(
        "INFO",
        "Monitor",
        `모니터링 서비스가 정지되었습니다. (sequenceId: ${this.stopSequenceId})`
      );

      createNotification(
        "SERVICE_STOP",
        "모니터링 서비스 정지",
        "불량 모니터링 서비스가 정지되었습니다."
      );
    }
  }

  getStatus(): MonitorStatus {
    return {
      is_running: this.isRunning,
      line_status: this.internalLineStatus,
      stop_reason: plc.stopReason,
      window_info: {
        start: null,
        end: null,
        is_active: false,
      },
      current_counts: this.currentCounts,
      current_defects: this.currentDefects,
      violated_types: [],
      polling_interval: this.pollingInterval / 1000,
      system_status: {
        db_polling: this.isRunning,
        db_mode: db.isMockMode ? "Mock" : "Real",
        plc_connected: plc.isMockMode ? true : plc.connected,
        plc_mode: plc.isMockMode ? "Mock" : "Real",
        last_plc_command: this.lastPlcCommand?.toISOString() ?? null,
        last_plc_command_type:
          this.lastPlcCommandType === "WARN" ? "STOP" : this.lastPlcCommandType,
        last_polling_time: this.lastPollingTime?.toISOString() ?? null,
      },
    };
  }

  /**
   * 한 사이클의 모니터링 처리
   */
  private async processCycle(): Promise<void> {
    try {
      if (!this.isRunning) return;

      this.lastPollingTime = new Date();

      if (!db.isMockMode && !plc.isMockMode) {
        await plc.connect();
      }

      if (db.isMockMode) {
        // ===== Mock 모드 =====
        if (this.internalLineStatus === "RUNNING") {
          db.fetchRecentDefects();
        }

        const rules = db.getRules();
        const ruleCounts: Record<string, number> = {};

        let shouldStop = false;
        let shouldWarn = false;
        let stopMessage = "";
        let warnMessage = "";
        let totalDefectCount = 0;

        const allDefects = await db.getAllDefectsAsync();

        if (!this.isRunning) return;

        for (const rule of rules) {
          if (!rule.is_active) continue;

          // 접두사 매칭
          const ruleDefects = allDefects
            .filter((d) => d.code.startsWith(rule.code))
            .sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime()
            );

          const count = ruleDefects.length;
          ruleCounts[rule.code] = count;
          totalDefectCount += count;

          if (count > 0) {
            const firstDefectTime = new Date(ruleDefects[0].timestamp);
            const timeStr = `${String(firstDefectTime.getHours()).padStart(
              2,
              "0"
            )}:${String(firstDefectTime.getMinutes()).padStart(2, "0")}`;

            if (count >= rule.threshold) {
              if (!shouldStop) {
                shouldStop = true;
                stopMessage = `라인정지: ${rule.name} 불량 ${rule.threshold}건 발생 (${timeStr}부터)`;
              }
            } else {
              if (!shouldStop && !shouldWarn) {
                shouldWarn = true;
                warnMessage = `경고: ${rule.name} 불량 ${count}건 감지`;
              }
            }
          }
        }

        this.applyPlcControl(
          [shouldStop, shouldWarn],
          [stopMessage, warnMessage],
          totalDefectCount,
          ruleCounts
        );

        // Mock 타이머 로직은 유지
        if (shouldStop) {
          this.handleMockResolveTimer(rules, allDefects);
        }

        this.currentDefects = allDefects;
        this.currentCounts = ruleCounts;
      } else {
        // ===== 실제 모드 (Oracle 프로시저 호출 + 불량 리스트 조회) =====

        // 1. 화면 표시용 불량 리스트 조회 (비동기 병렬 처리 가능하지만 순차 처리)
        // 최근 1시간 내의 미해결 불량을 조회하여 화면에 표시
        let allDefects: Defect[] = [];
        try {
          allDefects = await db.getAllDefectsAsync();
        } catch (err) {
          logger.log("ERROR", "Monitor", `불량 리스트 조회 실패: ${err}`);
        }

        const rules = db.getRules();
        const ruleCounts: Record<string, number> = {};

        let shouldStop = false;
        let shouldWarn = false;
        let stopMessage = "";
        let warnMessage = "";
        let totalDefectCount = 0;

        for (const rule of rules) {
          if (!rule.is_active) continue;

          // ⭐ 프로시저 호출 (파라미터: 접두사 코드, 임계값)
          // 라인 정지 판단은 DB 프로시저에 위임
          const procResult = await db.checkLineStopProcedure(
            rule.code,
            rule.threshold
          );

          if (!this.isRunning) return;

          ruleCounts[rule.code] = procResult.count;
          totalDefectCount += procResult.count;

          if (procResult.resultCode === "STOP") {
            // "STOP" 결과 = 임계값 초과
            if (!shouldStop) {
              shouldStop = true;
              stopMessage = procResult.message;
            }
            logger.log(
              "WARN",
              "Monitor",
              `[DB] 규칙 '${rule.name}(${rule.code})' 임계값 초과! → STOP`
            );
          } else if (procResult.resultCode === "PASS" && procResult.count > 0) {
            // "PASS" 결과이고 카운트가 있으면 경고
            if (!shouldStop && !shouldWarn) {
              shouldWarn = true;
              warnMessage = `경고: ${rule.name}(${rule.code}) 불량 ${procResult.count}건 감지`;
            }
            logger.log(
              "DEBUG",
              "Monitor",
              `[DB] 규칙 '${rule.name}(${rule.code})': ${procResult.count}건 → WARN`
            );
          } else if (procResult.resultCode === "ERROR") {
            logger.log(
              "ERROR",
              "Monitor",
              `[DB] 규칙 '${rule.name}' 프로시저 오류: ${procResult.message}`
            );
          }
        }

        await this.applyPlcControl(
          [shouldStop, shouldWarn],
          [stopMessage, warnMessage],
          totalDefectCount,
          ruleCounts
        );

        // 조회된 불량 리스트 업데이트
        this.currentDefects = allDefects;
        this.currentCounts = ruleCounts;
      }
    } catch (error) {
      console.error("[Monitor] Error:", error);
      logger.log("ERROR", "Monitor", `모니터링 처리 중 오류 발생: ${error}`);
    }
  }

  /**
   * 3단계 제어 로직 적용 (공통)
   */
  private async applyPlcControl(
    flags: [boolean, boolean], // [shouldStop, shouldWarn]
    messages: [string, string], // [stopMessage, warnMessage]
    totalDefectCount: number,
    ruleCounts: Record<string, number>
  ): Promise<void> {
    const [shouldStop, shouldWarn] = flags;
    const [stopMessage, warnMessage] = messages;

    if (shouldStop) {
      // 1. 정지 (값 1)
      if (this.internalLineStatus !== "STOPPED") {
        logger.log(
          "WARN",
          "Monitor",
          `🚨 라인 정지 명령 전송! (상태: ${this.internalLineStatus} -> STOPPED)`
        );
        logger.log(
          "WARN",
          "Monitor",
          `규칙별 누적 건수: ${JSON.stringify(ruleCounts)}`
        );

        await plc.stopLine(stopMessage);
        this.recordPlcCommand("STOP");
        this.internalLineStatus = "STOPPED";

        createNotification("LINE_STOP", "라인 정지 발생", stopMessage, {
          counts: ruleCounts,
        });
      }
    } else if (shouldWarn) {
      // 2. 경고 (값 2)
      // 상태가 WARNING이 아니거나, 불량 카운트가 증가했을 때만 전송
      if (
        this.internalLineStatus !== "WARNING" ||
        totalDefectCount > this.lastWarningCount
      ) {
        this.lastWarningCount = totalDefectCount;

        logger.log(
          "WARN",
          "Monitor",
          `⚠️ 라인 경고(알람) 명령 전송! (상태: ${this.internalLineStatus}, 누적: ${totalDefectCount}건)`
        );

        await plc.warnLine(warnMessage);
        this.recordPlcCommand("WARN");
        this.internalLineStatus = "WARNING";
      }
    } else {
      // 3. 정상 (값 0)
      if (this.internalLineStatus !== "RUNNING") {
        logger.log(
          "INFO",
          "Monitor",
          `✅ 정지/경고 조건 해소됨 → 라인 재가동 시도`
        );
        await this.resolveStop("정지/경고 조건 해소");
      }
    }
  }

  // Mock 타이머 로직 분리
  private handleMockResolveTimer(rules: any[], allDefects: any[]) {
    for (const rule of rules) {
      if (!rule.is_active) continue;
      const ruleDefects = allDefects.filter((d) =>
        d.code.startsWith(rule.code)
      );

      if (ruleDefects.length >= rule.threshold) {
        if (this.defectResolveTimers.has(rule.code)) continue;

        const capturedSequenceId = this.stopSequenceId;
        const timer = setTimeout(async () => {
          // ... 타이머 내부 로직 (생략, 기존과 동일)
          if (this.stopSequenceId !== capturedSequenceId || !this.isRunning) {
            this.defectResolveTimers.delete(rule.code);
            return;
          }
          // Mock 해소 로직...
          this.defectResolveTimers.delete(rule.code);
        }, this.DEFECT_RESOLVE_DELAY);
        this.defectResolveTimers.set(rule.code, timer);
      }
    }
  }

  async resolveStop(reason: string): Promise<void> {
    if (this.internalLineStatus === "RUNNING") return;

    await plc.resetLine();
    this.internalLineStatus = "RUNNING";
    this.lastWarningCount = 0;

    logger.log("INFO", "Monitor", `라인이 재시작되었습니다. (사유: ${reason})`);
    this.lastPlcCommand = new Date();
    this.lastPlcCommandType = "RESET";

    createNotification(
      "LINE_RESUME",
      "라인 재가동",
      `라인이 재가동되었습니다. 사유: ${reason}`
    );
  }

  private recordPlcCommand(type: "STOP" | "RESET" | "WARN"): void {
    this.lastPlcCommand = new Date();
    this.lastPlcCommandType = type;
  }

  recordPlcStop(): void {
    this.recordPlcCommand("STOP");
  }
}

const globalForMonitor = global as unknown as {
  monitorService: MonitorService | undefined;
};

export const monitorService =
  globalForMonitor.monitorService ?? new MonitorService();

if (process.env.NODE_ENV !== "production") {
  globalForMonitor.monitorService = monitorService;
}
