/**
 * @file src/lib/services/state.ts
 * @description
 * 전역 모니터링 상태 관리 모듈
 *
 * Next.js에서 각 라우트가 독립적으로 실행되면서 싱글톤이 제대로 작동하지 않는 문제를 해결합니다.
 * 이 모듈은 메모리에 모니터링 서비스의 상태를 중앙 집중식으로 관리합니다.
 *
 * 주요 역할:
 * 1. **모니터링 서비스 상태 저장**: running 여부, 인터벌 ID 등
 * 2. **라우트 간 상태 공유**: 모든 API 라우트에서 같은 상태 접근
 * 3. **전역 싱글톤 보장**: 여러 import에도 하나의 인스턴스만 사용
 *
 * 사용 방법:
 * import { globalState } from '@/lib/services/state';
 *
 * // 상태 조회
 * globalState.isRunning();
 * globalState.getIntervalId();
 *
 * // 상태 변경
 * globalState.setRunning(true);
 * globalState.setIntervalId(intervalId);
 */

/**
 * 전역 모니터링 상태를 관리하는 클래스
 */
class GlobalState {
  private monitoringRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

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
}

/**
 * 전역 상태 인스턴스 (싱글톤)
 */
export const globalState = new GlobalState();
