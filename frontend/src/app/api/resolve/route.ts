/**
 * @file src/app/api/resolve/route.ts
 * @description
 * POST /api/resolve - 라인 정지 해제 API
 *
 * Request Body:
 * {
 *   "reason": "해제 사유"
 * }
 *
 * Response:
 * {
 *   "status": "resolved"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { monitorService } from '@/lib/services/monitor';
import { logger } from '@/lib/services/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reason } = body;

    monitorService.resolveStop(reason);
    logger.log('INFO', 'API', `라인 정지 해제됨. 사유: ${reason}`);

    return NextResponse.json({ status: 'resolved' });
  } catch (error: any) {
    logger.log('ERROR', 'API', `라인 해제 중 오류 발생: ${error.message}`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
