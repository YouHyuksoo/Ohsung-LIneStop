/**
 * @file src/app/api/init/route.ts
 * @description
 * 서버 초기화 API
 *
 * 주요 기능:
 * - 모니터링 서비스의 현재 상태 조회
 * - 서버 초기화 확인
 *
 * 주의사항:
 * - 모니터링 서비스는 자동으로 시작되지 않음
 * - 관리자 페이지에서 명시적으로 시작/정지해야 함
 * - 서비스가 시작되지 않으면 DB 폴링이 발생하지 않음
 *
 * @example
 * GET /api/init
 * → { message: "Server initialized", running: false }
 */

import { NextResponse } from 'next/server';
import { monitorService } from '@/lib/services/monitor';

/**
 * 서버 초기화 상태 조회
 * 모니터링 서비스는 자동으로 시작하지 않음 (관리자가 수동 시작해야 함)
 */
export async function GET() {
  return NextResponse.json({
    message: 'Server initialized',
    running: monitorService.getStatus().is_running,
  });
}
