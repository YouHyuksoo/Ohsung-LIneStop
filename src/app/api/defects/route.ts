/**
 * @file src/app/api/defects/route.ts
 * @description
 * GET /api/defects - 불량 이력 조회 API
 *
 * Mock 모드: Mock DB에서 생성된 불량 반환
 * 실제 모드: Oracle DB (ICOM_RECIEVE_DATA_NG)에서 불량 조회
 *
 * 쿼리 파라미터:
 * - limit: 반환할 불량 개수 (기본: 1000)
 * - offset: 시작 위치 (기본: 0)
 *
 * Response:
 * Defect[] - 불량 이력 배열
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { logger } from '@/lib/services/logger';

export async function GET(request: any) {
  try {
    let defects;

    // Mock 모드 확인
    if (db.isMockMode) {
      // Mock 모드: 메모리에 저장된 Mock 불량 반환
      defects = db.mockDefects;
      logger.log('INFO', 'API', `Mock 불량 ${defects.length}개 반환`);
    } else {
      // 실제 모드: Oracle DB에서 비동기로 조회
      defects = await db.getAllDefectsAsync();
      logger.log('INFO', 'API', `Oracle DB에서 불량 ${defects.length}개 조회`);
    }

    return NextResponse.json(defects);
  } catch (error: any) {
    logger.log('ERROR', 'API', `불량 조회 실패: ${error.message}`);
    console.error('[API] Failed to fetch defects:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch defects' },
      { status: 500 }
    );
  }
}
