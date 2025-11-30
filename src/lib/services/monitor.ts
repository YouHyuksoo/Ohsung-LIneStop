/**
 * @file src/lib/services/monitor.ts
 * @description
 * 불량 모니터링 서비스의 핵심 로직
 *
 * 주요 기능:
 * 1. 실시간 불량 감지
 *    - 5초마다 현재 기준 과거 1시간 범위 내 미해결 불량 조회
 *    - DB의 ACTION_DATE 기반 자동 필터링 (Oracle DB 인덱스 활용)
 *    - 불량 코드별 카운팅
 *
 * 2. 자동 라인 정지
 *    - 불량 코드별 임계값 체크
 *    - 임계값 초과 시 PLC에 정지 신호 전송
 *    - 정지 사유 기록
 *
 * 3. 서비스 제어
 *    - 시작/정지 기능
 *    - 상태 조회 API
 *
 * 동작 원리:
 * - 5초마다 DB에서 현재 기준 1시간 이내의 미해결 불량 조회
 * - 규칙 활성화 상태 확인
 * - 불량 코드별 카운트 계산
 * - 임계값 초과 시 라인 정지
 *
 * 기본값 설정:
 * - 폴링 주기: 5초 (고정)
 * - 시간 범위: 현재 기준 과거 1시간 (SYSDATE - 1/24)
 * - 미해결 상태: NG_RELEASE_YN != 'Y'
 *
 * @example
 * import { monitorService } from '@/lib/services/monitor';
 *
 * // 서비스 시작
 * monitorService.start();
 *
 * // 상태 조회
 * const status = monitorService.getStatus();
 *
 * // 라인 정지 해제
 * monitorService.resolveStop('조치 완료');
 */

import { db } from "./db";
import { plc } from "./plc";
import { logger } from "./logger";
import { createNotification } from "../store/notification-store";

import { Defect, MonitorStatus } from "@/lib/types";

/**
 * 모니터링 서비스 클래스
 *
 * 아키텍처 설명:
 * 간단한 상태 관리: 메모리에 실행 상태와 PLC 명령 이력만 저장
 * DB는 5초마다 현재 기준 1시간 이내의 미해결 불량만 조회
 *
 * 인스턴스 속성:
 * - isRunning: 모니터링 서비스 실행 여부
 * - intervalId: 현재 실행 중인 인터벌 ID
 * - lastPlcCommand: 마지막 PLC 명령 시간
 * - lastPlcCommandType: 마지막 PLC 명령 타입 (STOP, RESET)
 * - currentCounts: 현재 카운트 (상태 조회 시 임시 계산)
 * - currentDefects: 현재 불량 (상태 조회 시 임시 저장)
 */
class MonitorService {
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastPlcCommand: Date | null = null;
  private lastPlcCommandType: "STOP" | "RESET" | null = null;
  private currentCounts: Record<string, number> = {};
  private currentDefects: Defect[] = [];
  private lastPollingTime: Date | null = null; // ⭐ 마지막 DB 폴링 시간
  private defectResolveTimers: Map<string, NodeJS.Timeout> = new Map(); // ⭐ 불양 해소 타이머
  private readonly DEFECT_RESOLVE_DELAY: number = 30000; // ⭐ 30초 후 자동 해소
  private stopSequenceId: number = 0; // ⭐ Stop 호출 시마다 증가하는 ID (타이머 인증용)
  private internalLineStatus: "RUNNING" | "STOPPED" = "RUNNING"; // ⭐ 내부 상태 추적 (통신 최소화)
  private pollingInterval: number = 30000; // ⭐ DB 폴링 주기 (기본 30초)
  private settingsFile: string = "";

  constructor() {
    this.settingsFile = path.join(process.cwd(), "settings.json");
    this.loadSettings();
  }

  /**
   * settings.json에서 폴링 주기 로드
   */
  private loadSettings(): void {
    try {
      if (fs.existsSync(this.settingsFile)) {
        const data = fs.readFileSync(this.settingsFile, "utf-8");
        const settings = JSON.parse(data);

        if (settings.polling?.interval !== undefined) {
          // 설정값은 초 단위, 내부적으로는 밀리초 사용
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

  /**
   * 모니터링 서비스를 시작합니다.
   *
   * 주의: 이미 실행 중이면 중복 시작을 방지합니다.
   * Hot Reload 시 이전 interval을 정리합니다.
   */
  async start(): Promise<void> {
    if (!this.isRunning) {
      // ⭐ Hot Reload 후 남아있을 수 있는 이전 interval을 정리
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        logger.log("INFO", "Monitor", "Hot Reload 후 이전 interval 정리 완료");
      }

      // ⭐ 이전에 예약된 불양 해소 타이머도 정리
      this.defectResolveTimers.forEach((timer) => {
        clearTimeout(timer);
      });
      this.defectResolveTimers.clear();

      this.isRunning = true;

      // ⭐ [초기화] 시작 시 딱 한 번 PLC 상태를 읽어 내부 상태 동기화
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
          // 실패 시 기본값 RUNNING 유지 (보수적 접근)
        }
      }

      // 첫 사이클을 즉시 실행한 후 설정된 주기마다 반복
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

      // ⭐ 알림 생성: 서비스 시작
      createNotification(
        "SERVICE_START",
        "모니터링 서비스 시작",
        "불량 모니터링 서비스가 시작되었습니다."
      );
    }
  }

  /**
   * 모니터링 서비스를 정지합니다.
   *
   * 동작:
   * - isRunning 플래그를 false로 설정
   * - stopSequenceId를 증가시켜 이미 예약된 타이머 콜백들이 실행되지 않도록 함
   * - 예약된 인터벌을 즉시 취소
   * - 진행 중인 processCycle은 자연스럽게 종료
   */
  stop(): void {
    if (this.isRunning) {
      this.isRunning = false;
      this.stopSequenceId++; // ⭐ 이미 예약된 타이머 콜백들을 무효화

      // ⭐ 메인 폴링 interval 취소
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      // ⭐ 예약된 모든 불양 해소 타이머 취소
      this.defectResolveTimers.forEach((timer) => {
        clearTimeout(timer);
      });
      this.defectResolveTimers.clear();

      logger.log(
        "INFO",
        "Monitor",
        `모니터링 서비스가 정지되었습니다. (sequenceId: ${this.stopSequenceId})`
      );

      // ⭐ 알림 생성: 서비스 정지
      createNotification(
        "SERVICE_STOP",
        "모니터링 서비스 정지",
        "불량 모니터링 서비스가 정지되었습니다."
      );
    }
  }

  /**
   * 현재 모니터링 상태를 반환합니다.
   *
   * 현재 상태는 다음을 포함합니다:
   * - 서비스 실행 여부
   * - 라인 상태 및 정지 사유
   * - 최근 1시간 불량 및 코드별 카운트
   * - 시스템 모드 (Mock/Real)
   *
   * @returns 모니터링 상태
   */
  getStatus(): MonitorStatus {
    return {
      is_running: this.isRunning,
      line_status: this.internalLineStatus, // ⭐ 통신 없이 내부 상태 반환
      stop_reason: plc.stopReason,
      window_info: {
        start: null,
        end: null,
        is_active: false,
      },
      current_counts: this.currentCounts,
      current_defects: this.currentDefects,
      violated_types: [],
      system_status: {
        db_polling: this.isRunning,
        db_mode: db.isMockMode ? "Mock" : "Real",
        plc_connected: true,
        plc_mode: plc.isMockMode ? "Mock" : "Real",
        last_plc_command: this.lastPlcCommand?.toISOString() ?? null,
        last_plc_command_type: this.lastPlcCommandType,
        last_polling_time: this.lastPollingTime?.toISOString() ?? null, // ⭐ 마지막 DB 폴링 시간
      },
    };
  }

  /**
   * 한 사이클의 모니터링 처리
   *
   * Mock 모드:
   * 1. DB에서 현재 기준 1시간 이내 미해결 불량 조회
   * 2. 코드별 카운트 계산
   * 3. 활성화된 규칙에서 임계값 체크
   * 4. 임계값 초과 시 라인 정지
   *
   * 실제 모드:
   * 1. SP_CHECK_LINE_STOP 프로시저 호출 (DB에서 판단)
   * 2. 프로시저 결과 ('STOP' 또는 'PASS') 받음
   * 3. STOP 결과면 라인 정지
   */
  private async processCycle(): Promise<void> {
    try {
      // ⭐ 서비스가 정지된 경우 처리 중단 (interval은 clearInterval로 취소되지만, 이미 예약된 콜백도 실행될 수 있음)
      if (!this.isRunning) {
        return;
      }

      // ⭐ 이 함수가 실행되면 DB 폴링이 발생한 것 = 마지막 폴링 시간 기록
      this.lastPollingTime = new Date();

      // ⭐ PLC 연결 확인 (실제 모드일 때)
      if (!db.isMockMode && !plc.isMockMode) {
        await plc.connect();
      }

      // ⭐ [최적화] 매 사이클마다 PLC 상태를 읽지 않음 (통신 최소화)
      // const currentPlcStatus = await plc.readStatus(); -> 제거

      if (db.isMockMode) {
        // ===== Mock 모드 (Oracle 프로시저와 동일한 메시지 로직) =====
        // 1. 새로운 Mock 불량 생성 (확률적)
        // ⭐ 라인이 RUNNING 상태일 때만 새로운 불량 생성 (정지 상태에서는 생성 안 함)
        // ⭐ 하지만 processCycle은 항상 실행되므로 lastPollingTime은 항상 업데이트됨
        if (this.internalLineStatus === "RUNNING") {
          db.fetchRecentDefects();
        } else {
          // 라인이 정지되었더라도, 폴링 시간은 업데이트 (DB 폴링은 계속 실행 중임을 나타냄)
          // 실제로는 폴링하지 않지만, 서비스는 여전히 실행 중
        }

        // 2. 활성화된 규칙을 순회하며 각 규칙에 대해 프로시저 시뮬레이션
        const rules = db.getRules();
        const ruleCounts: Record<string, number> = {};
        let shouldStop = false;
        let stopMessage = "";

        // 3. 전체 Mock 불량 조회
        const allDefects = await db.getAllDefectsAsync();

        // ⭐ async 작업 후 isRunning 재확인 (stop() 호출이 있었는지 확인)
        if (!this.isRunning) {
          return;
        }

        for (const rule of rules) {
          if (!rule.is_active) continue;

          // 4. 규칙별 불량 조회 (시간순 정렬)
          const ruleDefects = allDefects
            .filter((d) => d.code === rule.code)
            .sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime()
            );

          const count = ruleDefects.length;
          ruleCounts[rule.code] = count;

          // 5. 프로시저 메시지 생성 (프로시저와 동일한 로직)
          let procMessage = "";
          let procResultCode = "PASS";

          if (count > 0) {
            // 첫 번째 불량 시간 (프로시저의 V_SESSION_START)
            const firstDefectTime = new Date(ruleDefects[0].timestamp);
            const timeStr = `${String(firstDefectTime.getHours()).padStart(
              2,
              "0"
            )}:${String(firstDefectTime.getMinutes()).padStart(2, "0")}`;

            // 임계값 체크
            if (count >= rule.threshold) {
              procResultCode = "STOP";
              procMessage = `라인정지: ${rule.code} 불량 ${rule.threshold}건 발생 (${timeStr} 부터)`;
              if (!shouldStop) {
                shouldStop = true;
                stopMessage = procMessage;
              }
              logger.log(
                "WARN",
                "Monitor",
                `[Mock Procedure] 규칙 '${rule.name}' 임계값 초과! ${procMessage}`
              );
            } else {
              // 정상 상황 메시지
              procMessage = `${rule.code} 불량 ${count}건 (기준 ${rule.threshold}건) (${timeStr} 부터)`;
              logger.log(
                "DEBUG",
                "Monitor",
                `[Mock Procedure] 규칙 '${rule.name}': ${procMessage}`
              );
            }
          } else {
            // 불량이 없는 경우
            procMessage = `${rule.code} 불량 0건 (기준 ${rule.threshold}건)`;
            logger.log(
              "DEBUG",
              "Monitor",
              `[Mock Procedure] 규칙 '${rule.name}': ${procMessage}`
            );
          }
        }

        // 6. 라인 제어 로직 (사용자 요청 반영)
        if (shouldStop) {
          // ⭐ 정지 상황: 중복 전송 허용 (확실한 정지를 위해)
          // 하지만 로그 폭주를 막기 위해 내부 상태 체크는 로깅에만 활용 가능
          logger.log(
            "WARN",
            "Monitor",
            `[Mock Procedure] 라인 정지 명령 전송! (상태: ${this.internalLineStatus})`
          );
          logger.log(
            "WARN",
            "Monitor",
            `규칙별 누적 건수: ${JSON.stringify(ruleCounts)}`
          );

          await plc.stopLine(stopMessage);
          this.recordPlcStop();
          this.internalLineStatus = "STOPPED"; // 내부 상태 업데이트

          // 알림은 중복 방지 (너무 자주 오면 곤란하므로)
          // TODO: 알림 중복 방지 로직 필요 시 추가
          createNotification("LINE_STOP", "라인 정지 발생", stopMessage, {
            counts: ruleCounts,
          });

          // ⭐ 임계값 도달한 규칙의 불양 자동 해소 타이머 설정
          for (const rule of rules) {
            if (!rule.is_active) continue;
            const ruleDefects = allDefects.filter((d) => d.code === rule.code);
            if (ruleDefects.length >= rule.threshold) {
              // 이 규칙에 대한 타이머가 이미 있으면 취소
              if (this.defectResolveTimers.has(rule.code)) {
                const oldTimer = this.defectResolveTimers.get(rule.code);
                if (oldTimer) clearTimeout(oldTimer);
              }

              // ⭐ 타이머 생성 시점의 stopSequenceId 캡처
              const capturedSequenceId = this.stopSequenceId;

              // 30초 후 자동으로 불양 해소
              const timer = setTimeout(() => {
                // ⭐ 타이머 콜백 실행 시 여러 검증:
                // 1. 현재 stopSequenceId가 생성 시점과 다르면 이 타이머는 invalidated 상태
                // 2. isRunning 플래그 재확인 (double-check)
                if (
                  this.stopSequenceId !== capturedSequenceId ||
                  !this.isRunning
                ) {
                  logger.log(
                    "DEBUG",
                    "Monitor",
                    `타이머 콜백 무효화됨: ${rule.code} (seqId: ${capturedSequenceId} vs ${this.stopSequenceId})`
                  );
                  this.defectResolveTimers.delete(rule.code);
                  return;
                }

                db.resolveMockDefectsByCode(rule.code);

                // ⭐ 불양 해소 후 라인 자동 재시작
                // 여기서도 상태 체크를 통해 중복 실행 방지 (하지만 resetLine 내부에서 체크할 수도 있음)
                // 비동기 함수 내에서 plc.readStatus()를 다시 호출하여 최신 상태 확인
                if (this.internalLineStatus === "STOPPED") {
                  this.resolveStop("Auto Reset");
                  logger.log(
                    "INFO",
                    "Monitor",
                    `불양 해소됨: ${rule.code} → 라인 자동 재시작`
                  );
                }

                this.defectResolveTimers.delete(rule.code);
              }, this.DEFECT_RESOLVE_DELAY);

              this.defectResolveTimers.set(rule.code, timer);
              logger.log(
                "DEBUG",
                "Monitor",
                `규칙 '${rule.name}' 불양 ${
                  this.DEFECT_RESOLVE_DELAY / 1000
                }초 후 자동 해소 예약됨 (seqId: ${capturedSequenceId})`
              );
            }
          }
        } else {
          // ⭐ 정상 상황 (해제): 중복 전송 방지 (평시 통신 최소화)
          if (this.internalLineStatus === "STOPPED") {
            // 이전에 정지 상태였던 경우에만 해제 신호 전송
            logger.log(
              "INFO",
              "Monitor",
              "정지 조건 해소됨 -> 라인 재가동 시도"
            );
            await this.resolveStop("정지 조건 해소");
          }
          // RUNNING 상태라면 아무것도 하지 않음 (통신 0)
        }

        // 7. 상태 메모리 업데이트 (규칙별 카운트 적용)
        this.currentDefects = allDefects;
        this.currentCounts = ruleCounts;
      } else {
        // ===== 실제 모드 (Oracle DB 프로시저 사용 - 규칙별 호출) =====
        // 1. 활성화된 규칙을 순회하며 각 규칙에 대해 프로시저 호출
        const rules = db.getRules();
        const ruleCounts: Record<string, number> = {};
        let shouldStop = false;
        let stopMessage = "";

        for (const rule of rules) {
          if (!rule.is_active) continue;

          // 2. 각 규칙에 대해 프로시저 호출 (불량 코드, 임계값 전달)
          const procResult = await db.checkLineStopProcedure(
            rule.code,
            rule.threshold
          );

          // ⭐ async 작업 후 isRunning 재확인 (stop() 호출이 있었는지 확인)
          if (!this.isRunning) {
            return;
          }

          // 3. 규칙별 누적 건수 저장
          ruleCounts[rule.code] = procResult.count;

          // 4. STOP 결과 확인
          if (procResult.resultCode === "STOP" && !shouldStop) {
            shouldStop = true;
            stopMessage = procResult.message;
            logger.log(
              "WARN",
              "Monitor",
              `[DB Procedure] 규칙 '${rule.name}' 임계값 초과! ${procResult.message}`
            );
          } else if (procResult.resultCode === "PASS") {
            logger.log(
              "DEBUG",
              "Monitor",
              `[DB Procedure] 규칙 '${rule.name}': ${procResult.count}건 (정상)`
            );
          } else if (procResult.resultCode === "ERROR") {
            logger.log(
              "ERROR",
              "Monitor",
              `[DB Procedure] 규칙 '${rule.name}' 프로시저 오류: ${procResult.message}`
            );
          }
        }

        // 6. 라인 제어 로직 (실제 모드)
        if (shouldStop) {
          // ⭐ 정지 상황: 중복 전송 허용
          logger.log("WARN", "Monitor", `[DB Procedure] 라인 정지 명령 전송!`);
          logger.log(
            "WARN",
            "Monitor",
            `규칙별 누적 건수: ${JSON.stringify(ruleCounts)}`
          );
          await plc.stopLine(stopMessage);
          this.recordPlcStop();
          this.internalLineStatus = "STOPPED";

          // ⭐ 알림 생성: 라인 정지
          createNotification("LINE_STOP", "라인 정지 발생", stopMessage, {
            counts: ruleCounts,
          });
        } else {
          // ⭐ 정상 상황: 중복 전송 방지
          if (this.internalLineStatus === "STOPPED") {
            logger.log(
              "INFO",
              "Monitor",
              "정지 조건 해소됨 -> 라인 재가동 시도"
            );
            await this.resolveStop("정지 조건 해소");
          }
        }

        // 6. 상태 메모리 업데이트 (규칙별 카운트 적용)
        this.currentDefects = [];
        this.currentCounts = ruleCounts;
      }
    } catch (error) {
      console.error("[Monitor] Error:", error);
      logger.log("ERROR", "Monitor", `모니터링 처리 중 오류 발생: ${error}`);
    }
  }

  /**
   * 라인 정지를 해제합니다.
   *
   * 동작:
   * 1. PLC에 라인 재시작 신호 전송
   * 2. 마지막 PLC 명령 기록
   *
   * 주의: 라인 재시작 후 다음 사이클부터
   * 새로운 1시간 범위에서 불량을 집계합니다.
   *
   * @param reason - 해제 사유
   */
  async resolveStop(reason: string): Promise<void> {
    // ⭐ 중복 전송 방지 (이미 RUNNING이면 전송 안함)
    if (this.internalLineStatus === "RUNNING") {
      logger.log(
        "INFO",
        "Monitor",
        `이미 라인이 가동 중입니다. (요청 사유: ${reason})`
      );
      return;
    }

    await plc.resetLine();
    this.internalLineStatus = "RUNNING"; // 상태 업데이트

    logger.log("INFO", "Monitor", `라인이 재시작되었습니다. (사유: ${reason})`);

    this.lastPlcCommand = new Date();
    this.lastPlcCommandType = "RESET";

    // ⭐ 알림 생성: 라인 재가동
    createNotification(
      "LINE_RESUME",
      "라인 재가동",
      `라인이 재가동되었습니다. 사유: ${reason}`
    );
  }

  /**
   * PLC 정지 명령을 기록합니다 (내부용)
   * @internal
   */
  recordPlcStop(): void {
    this.lastPlcCommand = new Date();
    this.lastPlcCommandType = "STOP";
  }
}

/**
 * 전역 모니터링 서비스 인스턴스 (싱글톤)
 * Next.js 개발 환경에서 모듈 리로드 시 인스턴스가 초기화되는 것을 방지하기 위해
 * global 객체에 인스턴스를 저장하여 재사용합니다.
 */
const globalForMonitor = global as unknown as {
  monitorService: MonitorService | undefined;
};

export const monitorService =
  globalForMonitor.monitorService ?? new MonitorService();

if (process.env.NODE_ENV !== "production") {
  globalForMonitor.monitorService = monitorService;
}
