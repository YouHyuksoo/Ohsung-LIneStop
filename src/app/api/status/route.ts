/**
 * @file src/app/api/status/route.ts
 * @description
 * GET /api/status - 현재 모니터링 상태 조회 API
 *
 * Mock 모드: Mock DB의 누적 카운트 반환
 * 실제 모드: Oracle DB (ICOM_RECIEVE_DATA_NG)에서 누적 카운트 조회
 *
 * 반환 데이터:
 * - is_running: 모니터링 서비스 실행 여부
 * - line_status: 라인 상태 (RUNNING/STOPPED)
 * - stop_reason: 정지 사유
 * - window_info: 윈도우 시작/종료 시간, 활성 여부
 * - current_counts: 불량 코드별 카운트 (현재 윈도우)
 * - current_defects: 현재 윈도우의 불량 리스트
 * - total_counts: 불량 코드별 누적 카운트 (Oracle DB의 전체 데이터)
 * - polling_interval: DB 폴링 주기 (초)
 * - db_mode: Mock 또는 Real
 *
 * 주의: rules는 /api/admin/rules에서 별도로 조회
 */

import { NextResponse } from "next/server";
import { monitorService } from "@/lib/services/monitor";
import { logger } from "@/lib/services/logger";

export async function GET() {
  try {
    // monitorService에서 캐시된 상태만 반환 (DB 조회 X)
    const status = monitorService.getStatus();

    return NextResponse.json({
      ...status,
      total_counts: status.current_counts, // 이미 계산된 카운트 사용
      // ⭐ monitorService에서 반환하는 실제 폴링 주기 사용
      // ⭐ rules 제거: 클라이언트에서 /api/admin/rules로 별도 조회
    });
  } catch (error: any) {
    logger.log("ERROR", "API", `상태 조회 실패: ${error.message}`);
    console.error("[API] Failed to fetch status:", error);

    // 오류 발생시 기본 상태 반환
    const status = monitorService.getStatus();

    return NextResponse.json({
      ...status,
      total_counts: {},
      error: error.message,
    });
  }
}
