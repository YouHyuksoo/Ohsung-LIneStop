/**
 * @file src/app/api/status/route.ts
 * @description
 * GET /api/status - 현재 모니터링 상태 조회 API
 *
 * 반환 데이터:
 * - is_running: 모니터링 서비스 실행 여부
 * - line_status: 라인 상태 (RUNNING/STOPPED)
 * - stop_reason: 정지 사유
 * - window_info: 윈도우 시작/종료 시간, 활성 여부
 * - current_counts: 불량 코드별 카운트
 * - current_defects: 현재 윈도우의 불량 리스트
 */

import { NextResponse } from 'next/server';
import { monitorService } from '@/lib/services/monitor';

export async function GET() {
  const status = monitorService.getStatus();
  return NextResponse.json(status);
}
