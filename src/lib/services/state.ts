/**
 * @file src/lib/services/state.ts
 * @description
 * 전역 모니터링 상태 관리 모듈
 *
 * Next.js에서 각 라우트가 독립적으로 실행되면서 싱글톤이 제대로 작동하지 않는 문제를 해결합니다.
 * 이 모듈은 메모리에 모니터링 서비스의 모든 상태를 중앙 집중식으로 관리합니다.
 *
 * 주요 역할:
 * 1. **모니터링 서비스 제어 상태**: running 여부, 인터벌 ID
 * 2. **윈도우 상태 관리**: 윈도우 시작/종료 시간, 불량 카운트, 불량 리스트
 * 3. **라우트 간 상태 공유**: 모든 API 라우트에서 같은 상태 접근
 * 4. **전역 싱글톤 보장**: 여러 import에도 하나의 인스턴스만 사용
 *
 * 아키텍처 설명:
 * - MonitorService는 processCycle()에서 globalState를 통해 윈도우 상태를 업데이트
 * - API 라우트 (/api/status)는 getStatus()에서 globalState를 읽어 응답
 * - 따라서 모든 라우트가 최신의 통일된 상태에 접근 가능
 *
 * 사용 방법:
 * import { globalState } from '@/lib/services/state';
 *
 * // 제어 상태 조회
 * globalState.isRunning();
 * globalState.getIntervalId();
 *
 * // 윈도우 상태 조회
 * globalState.getWindowStartTime();
 * globalState.getWindowEndTime();
 * globalState.getCurrentCounts();
 * globalState.getCurrentDefects();
 *
 * // 상태 변경
 * globalState.setRunning(true);
 * globalState.setWindowStartTime(new Date());
 * globalState.addDefect(defect);
 */

import { Defect } from '@/lib/types';

/**
 * 전역 모니터링 상태를 관리하는 클래스
 *
 * 초보자 가이드:
 * 1. **제어 상태 (Control State)**: 모니터링 서비스 실행 여부 및 인터벌 관리
 *    - isRunning(): 현재 모니터링 서비스가 실행 중인지 확인
 *    - setRunning(bool): 실행 상태 변경
 *    - getIntervalId(): 현재 실행 중인 인터벌 ID 조회
 *    - setIntervalId(id): 인터벌 ID 저장
 *    - clearInterval(): 인터벌 정지 및 ID 초기화
 *
 * 2. **윈도우 상태 (Window State)**: 1시간 윈도우 내의 불량 집계 정보
 *    - getWindowStartTime(): 현재 윈도우 시작 시간
 *    - setWindowStartTime(time): 윈도우 시작 시간 설정 (첫 불량 발생 시)
 *    - getWindowEndTime(): 현재 윈도우 종료 시간 (시작 + 1시간)
 *    - setWindowEndTime(time): 윈도우 종료 시간 설정
 *    - getCurrentCounts(): 불량 코드별 카운트 조회 (예: {NG001: 3, NG002: 1})
 *    - setCurrentCounts(counts): 카운트 전체 업데이트
 *    - incrementCount(code): 특정 불량 코드 카운트 증가
 *    - getCurrentDefects(): 현재 윈도우 내의 모든 불량 리스트
 *    - setCurrentDefects(defects): 불량 리스트 업데이트
 *    - addDefect(defect): 불량 리스트에 새 불량 추가
 *    - resetWindow(): 윈도우 전체 리셋 (시간 만료 또는 라인 재시작 시)
 *
 * @example
 * // 윈도우 시작
 * const now = new Date();
 * globalState.setWindowStartTime(now);
 * globalState.setWindowEndTime(new Date(now.getTime() + 60 * 60 * 1000));
 *
 * // 불량 추가
 * globalState.addDefect(defect);
 * globalState.incrementCount(defect.code);
 *
 * // 윈도우 만료 시 리셋
 * if (new Date() > globalState.getWindowEndTime()) {
 *   globalState.resetWindow();
 * }
 */
class GlobalState {
  // ====== 제어 상태 ======
  private monitoringRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  // ====== 윈도우 상태 ======
  private windowStartTime: Date | null = null;
  private windowEndTime: Date | null = null;
  private currentCounts: Record<string, number> = {};
  private windowDefects: Defect[] = [];

  // ====== 제어 상태 메서드 ======

  /**
   * 모니터링 서비스 실행 여부를 반환합니다.
   */
  isRunning(): boolean {
    return this.monitoringRunning;
  }

  /**
   * 모니터링 서비스 실행 여부를 설정합니다.
   *
   * @param running - 실행 여부
   */
  setRunning(running: boolean): void {
    this.monitoringRunning = running;
  }

  /**
   * 인터벌 ID를 반환합니다.
   */
  getIntervalId(): NodeJS.Timeout | null {
    return this.intervalId;
  }

  /**
   * 인터벌 ID를 설정합니다.
   *
   * @param id - 인터벌 ID
   */
  setIntervalId(id: NodeJS.Timeout | null): void {
    this.intervalId = id;
  }

  /**
   * 인터벌을 클리어합니다.
   */
  clearInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // ====== 윈도우 상태 메서드 ======

  /**
   * 윈도우 시작 시간을 반환합니다.
   */
  getWindowStartTime(): Date | null {
    return this.windowStartTime;
  }

  /**
   * 윈도우 시작 시간을 설정합니다.
   *
   * @param time - 시작 시간
   */
  setWindowStartTime(time: Date | null): void {
    this.windowStartTime = time;
  }

  /**
   * 윈도우 종료 시간을 반환합니다.
   */
  getWindowEndTime(): Date | null {
    return this.windowEndTime;
  }

  /**
   * 윈도우 종료 시간을 설정합니다.
   *
   * @param time - 종료 시간
   */
  setWindowEndTime(time: Date | null): void {
    this.windowEndTime = time;
  }

  /**
   * 불량 코드별 카운트를 반환합니다.
   *
   * @returns 카운트 객체 (예: {NG001: 3, NG002: 1})
   */
  getCurrentCounts(): Record<string, number> {
    return this.currentCounts;
  }

  /**
   * 불량 카운트를 전체 업데이트합니다.
   *
   * @param counts - 새로운 카운트 객체
   */
  setCurrentCounts(counts: Record<string, number>): void {
    this.currentCounts = counts;
  }

  /**
   * 특정 불량 코드의 카운트를 1 증가시킵니다.
   *
   * @param code - 불량 코드 (예: "NG001")
   */
  incrementCount(code: string): void {
    this.currentCounts[code] = (this.currentCounts[code] || 0) + 1;
  }

  /**
   * 현재 윈도우 내의 불량 리스트를 반환합니다.
   */
  getCurrentDefects(): Defect[] {
    return this.windowDefects;
  }

  /**
   * 불량 리스트를 전체 업데이트합니다.
   *
   * @param defects - 새로운 불량 리스트
   */
  setCurrentDefects(defects: Defect[]): void {
    this.windowDefects = defects;
  }

  /**
   * 불량 리스트에 새로운 불량을 추가합니다.
   *
   * @param defect - 추가할 불량
   */
  addDefect(defect: Defect): void {
    this.windowDefects.push(defect);
  }

  /**
   * 윈도우를 리셋합니다.
   * 시간 만료 시 또는 라인 재시작 시 호출됩니다.
   */
  resetWindow(): void {
    this.windowStartTime = null;
    this.windowEndTime = null;
    this.currentCounts = {};
    this.windowDefects = [];
  }

  /**
   * 윈도우가 활성 상태인지 확인합니다.
   *
   * @returns 윈도우 활성 여부
   */
  isWindowActive(): boolean {
    if (!this.windowEndTime) return false;
    return new Date() < this.windowEndTime;
  }
}

/**
 * 전역 상태 인스턴스 (싱글톤)
 * 모든 라우트가 이 인스턴스를 공유하므로 상태 일관성이 보장됩니다.
 */
export const globalState = new GlobalState();
