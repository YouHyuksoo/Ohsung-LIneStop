/**
 * @file src/app/api/logs/route.ts
 * @description
 * 로그 조회 및 삭제 API
 *
 * 엔드포인트:
 * - GET /api/logs - 로그 조회 (필터링 지원)
 * - DELETE /api/logs - 모든 로그 삭제
 *
 * 쿼리 파라미터:
 * - level: 로그 레벨 필터 (INFO, WARN, ERROR, DEBUG)
 * - component: 컴포넌트 필터 (Monitor, PLC, DB, API, System, Admin)
 * - search: 검색어 (메시지 내용 검색)
 * - limit: 반환할 로그 개수 (기본: 100)
 *
 * 주요 기능:
 * 1. **로그 조회**: Logger 서비스에서 로그 가져오기
 * 2. **필터링**: 레벨, 컴포넌트, 검색어로 필터
 * 3. **로그 삭제**: 모든 로그 일괄 삭제
 *
 * 사용 예시:
 * - GET /api/logs
 * - GET /api/logs?level=ERROR
 * - GET /api/logs?component=Monitor&search=불량
 * - DELETE /api/logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/services/logger';

/**
 * GET /api/logs
 * 로그 조회 (필터링 지원)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const level = searchParams.get('level') || undefined;
    const component = searchParams.get('component') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100');

    // Logger에서 로그 조회
    const logs = logger.getFilteredLogs({
      level: level as any,
      component: component as any,
      search,
      limit,
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('Failed to fetch logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/logs
 * 모든 로그 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    logger.clearLogs();

    logger.log('INFO', 'Admin', '모든 로그가 삭제되었습니다.');

    return NextResponse.json({ message: 'All logs cleared successfully' });
  } catch (error: any) {
    console.error('Failed to clear logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clear logs' },
      { status: 500 }
    );
  }
}
