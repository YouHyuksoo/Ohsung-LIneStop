/**
 * @file src/lib/services/monitor.ts
 * @description
 * 불량 모니터링 서비스의 핵심 로직
 *
 * 주요 기능:
 * 1. 윈도우 기반 불량 집계
 *    - 첫 불량 발생 시 1시간 윈도우 시작
 *    - 윈도우 내 불량 코드별 카운팅
 *    - 윈도우 만료 시 자동 리셋
 *
 * 2. 자동 라인 정지
 *    - 임계값 초과 시 PLC에 정지 신호 전송
 *    - 정지 사유 기록
 *
 * 3. 서비스 제어
 *    - 시작/정지 기능
 *    - 상태 조회 API
 *
 * 동작 원리:
 * - 5초마다 DB에서 새로운 불량 조회
 * - 활성화된 규칙과 매칭
 * - 윈도우 내 카운트 누적
 * - 임계값 초과 시 라인 정지
 *
 * 주의사항:
 * - 라인 정지 해제 시 윈도우는 리셋되지 않음 (시간 만료 시에만 리셋)
 * - 이는 재발 방지를 위한 설계
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

import { db } from './db';
import { plc } from './plc';
import { logger } from './logger';
import { Defect, MonitorStatus } from '@/lib/types';

/**
 * 모니터링 서비스 클래스
 */
class MonitorService {
  private running: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  // 윈도우 상태 관리
  private windowStartTime: Date | null = null;
  private windowEndTime: Date | null = null;
  private currentCounts: Record<string, number> = {};
  private windowDefects: Defect[] = [];

  // 시스템 상태 추적
  private lastPlcCommand: Date | null = null;
  private lastPlcCommandType: 'STOP' | 'RESET' | null = null;

  /**
   * 모니터링 서비스를 시작합니다.
   */
  start(): void {
    if (!this.running) {
      this.running = true;
      this.intervalId = setInterval(() => this.processCycle(), 5000);
      console.log('[Monitor] Service Started');
      logger.log('INFO', 'Monitor', '모니터링 서비스가 시작되었습니다.');
    }
  }

  /**
   * 모니터링 서비스를 정지합니다.
   */
  stop(): void {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[Monitor] Service Stopped');
    logger.log('INFO', 'Monitor', '모니터링 서비스가 정지되었습니다.');
  }

  /**
   * 현재 모니터링 상태를 반환합니다.
   *
   * @returns 서비스 상태, 라인 상태, 윈도우 정보, 카운트, 불량 리스트, 시스템 상태
   */
  getStatus(): MonitorStatus {
    return {
      is_running: this.running,
      line_status: plc.readStatus(),
      stop_reason: plc.stopReason,
      window_info: {
        start: this.windowStartTime?.toISOString() ?? null,
        end: this.windowEndTime?.toISOString() ?? null,
        is_active: this.isWindowActive(),
      },
      current_counts: this.currentCounts,
      current_defects: this.windowDefects,
      system_status: {
        db_polling: this.running,
        db_mode: db.isMockMode ? 'Mock' : 'Real',
        plc_connected: true, // 항상 연결됨 (Mock 또는 Real)
        plc_mode: plc.isMockMode ? 'Mock' : 'Real',
        last_plc_command: this.lastPlcCommand?.toISOString() ?? null,
        last_plc_command_type: this.lastPlcCommandType,
      },
    };
  }

  /**
   * 윈도우가 활성 상태인지 확인합니다.
   *
   * @returns 윈도우 활성 여부
   */
  private isWindowActive(): boolean {
    if (!this.windowEndTime) return false;
    return new Date() < this.windowEndTime;
  }

  /**
   * 한 사이클의 모니터링 처리
   * 1. 윈도우 만료 체크
   * 2. 새로운 불량 조회
   * 3. 불량 처리
   */
  private processCycle(): void {
    try {
      // 1. 윈도우 만료 체크
      if (this.windowEndTime && new Date() > this.windowEndTime) {
        console.log('[Monitor] Window Expired. Resetting counts.');
        logger.log('INFO', 'Monitor', '윈도우가 만료되어 카운트를 리셋합니다.');
        this.resetWindow();
      }

      // 2. 새로운 불량 조회
      const newDefects = db.fetchRecentDefects();

      // 3. 각 불량 처리
      for (const defect of newDefects) {
        this.handleDefect(defect);
      }
    } catch (error) {
      console.error('[Monitor] Error:', error);
      logger.log('ERROR', 'Monitor', `모니터링 처리 중 오류 발생: ${error}`);
    }
  }

  /**
   * 불량 발생 처리
   *
   * @param defect - 발생한 불량
   */
  private handleDefect(defect: Defect): void {
    // 규칙 조회
    const rule = db.getRule(defect.code);
    if (!rule || !rule.is_active) {
      console.log(`[Monitor] Ignoring defect ${defect.code} (No active rule)`);
      return;
    }

    const now = new Date();

    // 윈도우가 비활성 상태면 새로 시작
    if (!this.isWindowActive()) {
      console.log(`[Monitor] Starting New Window triggered by ${defect.code}`);
      logger.log('INFO', 'Monitor', `새 윈도우 시작 (불량 코드: ${defect.code})`);
      this.windowStartTime = now;
      this.windowEndTime = new Date(now.getTime() + 60 * 60 * 1000); // 1시간 후
      this.currentCounts = {};
      this.windowDefects = [];
    }

    // 윈도우에 불량 추가
    this.windowDefects.push(defect);
    this.currentCounts[defect.code] = (this.currentCounts[defect.code] || 0) + 1;

    const count = this.currentCounts[defect.code];
    console.log(`[Monitor] Defect ${defect.code} Count: ${count} / Threshold: ${rule.threshold}`);

    // 임계값 체크
    if (count >= rule.threshold) {
      if (plc.readStatus() === 'RUNNING') {
        const reason = `${rule.name} (${defect.code}) ${count}회 발생 (기준 ${rule.threshold}회)`;
        logger.log('WARN', 'Monitor', `임계값 초과! ${reason}`);
        plc.stopLine(reason);
        this.recordPlcStop(); // PLC 정지 명령 기록
      }
    }
  }

  /**
   * 윈도우를 리셋합니다.
   * 시간 만료 시에만 호출됩니다.
   */
  private resetWindow(): void {
    this.windowStartTime = null;
    this.windowEndTime = null;
    this.currentCounts = {};
    this.windowDefects = [];
  }

  /**
   * 라인 정지를 해제합니다.
   *
   * 주의: 윈도우는 리셋하지 않습니다!
   * 윈도우는 시간이 만료될 때까지 계속 유지되며,
   * 이는 재발 방지를 위한 설계입니다.
   *
   * @param reason - 해제 사유
   */
  resolveStop(reason: string): void {
    plc.resetLine();
    this.lastPlcCommand = new Date();
    this.lastPlcCommandType = 'RESET';
    // 윈도우는 리셋하지 않음 (시간 만료 시에만 리셋)
  }

  /**
   * PLC 정지 명령을 기록합니다 (내부용)
   * @internal
   */
  recordPlcStop(): void {
    this.lastPlcCommand = new Date();
    this.lastPlcCommandType = 'STOP';
  }
}

/**
 * 전역 모니터링 서비스 인스턴스
 */
export const monitorService = new MonitorService();
