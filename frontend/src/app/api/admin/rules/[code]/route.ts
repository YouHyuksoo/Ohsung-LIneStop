/**
 * @file src/app/api/admin/rules/[code]/route.ts
 * @description
 * DELETE /api/admin/rules/{code} - 특정 불량 규칙 삭제 API
 *
 * Path Parameter:
 * - code: 삭제할 규칙의 코드
 *
 * Response:
 * {
 *   "status": "deleted"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { logger } from '@/lib/services/logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    db.deleteRule(code);
    logger.log('INFO', 'Admin', `관리자가 규칙을 삭제했습니다: ${code}`);

    return NextResponse.json({ status: 'deleted' });
  } catch (error: any) {
    logger.log('ERROR', 'Admin', `규칙 삭제 중 오류 발생: ${error.message}`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
