/**
 * @file src/lib/store/monitor.ts
 * @description
 * Zustand를 이용한 모니터링 상태 글로벌 관리
 *
 * 주요 기능:
 * 1. 모니터링 서비스 실행 상태 (isRunning)
 * 2. 마지막 DB 폴링 시간 (lastPollingTime)
 * 3. 현재 불량 카운트 (currentCounts)
 * 4. 현재 불량 목록 (currentDefects)
 *
 * 특징:
 * - Zustand로 클라이언트/서버 상태 통합 관리
 * - Hot Reload 후에도 상태 유지
 * - Frontend에서 Backend 상태와 동기화
 *
 * 사용법:
 * import { useMonitorStore } from '@/lib/store/monitor';
 * const { isRunning, lastPollingTime } = useMonitorStore();
 * const setMonitorState = useMonitorStore((state) => state.setMonitorState);
 *
 * @example
 * // 상태 업데이트
 * setMonitorState({
 *   isRunning: true,
 *   lastPollingTime: new Date().toISOString(),
 *   currentCounts: { NG001: 3, NG002: 1 }
 * });
 */

import { create } from 'zustand';
import { Defect } from '@/lib/types';

/**
 * 모니터링 상태 인터페이스
 */
interface MonitorState {
  // 상태 데이터
  isRunning: boolean;
  lastPollingTime: string | null; // ISO 문자열로 저장 (직렬화 가능)
  currentCounts: Record<string, number>;
  currentDefects: Defect[];

  // 상태 업데이트 함수
  setMonitorState: (state: Partial<MonitorState>) => void;
  reset: () => void;
}

/**
 * 기본 상태값
 */
const initialState = {
  isRunning: false,
  lastPollingTime: null,
  currentCounts: {},
  currentDefects: [],
};

/**
 * 모니터링 상태 Zustand Store
 *
 * 이 store는:
 * - Backend의 모니터링 서비스 상태를 저장
 * - Frontend의 모니터링 페이지에서 참조
 * - 1초마다 /api/status에서 업데이트됨
 */
export const useMonitorStore = create<MonitorState>((set) => ({
  ...initialState,

  /**
   * 모니터링 상태를 일괄 업데이트합니다.
   * Backend에서 /api/status 호출 후 이 함수로 상태를 동기화합니다.
   *
   * @param state - 업데이트할 상태 (일부만 전달 가능)
   */
  setMonitorState: (state: Partial<MonitorState>) => {
    set((prevState) => ({
      ...prevState,
      ...state,
    }));
  },

  /**
   * 모든 상태를 초기값으로 리셋합니다.
   */
  reset: () => {
    set(initialState);
  },
}));
