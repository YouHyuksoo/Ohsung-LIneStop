/**
 * @file src/app/api/defects/route.ts
 * @description
 * GET /api/defects - 불량 이력 조회 API
 *
 * 현재는 Mock 데이터를 반환합니다.
 * 실제 환경에서는 페이지네이션 및 필터링 파라미터를 추가해야 합니다.
 *
 * Response:
 * Defect[] - 불량 이력 배열
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/services/db';

export async function GET() {
  const defects = db.mockDefects;
  return NextResponse.json(defects);
}
