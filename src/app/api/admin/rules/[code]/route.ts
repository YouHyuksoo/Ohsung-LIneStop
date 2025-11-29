/**
 * @file src/app/api/admin/rules/[code]/route.ts
 * @description
 * PUT /api/admin/rules/{code} - 특정 불량 규칙 수정 API
 * DELETE /api/admin/rules/{code} - 특정 불량 규칙 삭제 API
 *
 * Path Parameter:
 * - code: 수정/삭제할 규칙의 코드
 *
 * PUT Request Body:
 * {
 *   "name": "불량명",
 *   "threshold": 3
 * }
 *
 * Response:
 * {
 *   "status": "updated" | "deleted"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { logger } from '@/lib/services/logger';

/**
 * 규칙 수정 (PUT)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();

    // 기존 규칙 조회
    const existingRule = db.getRule(code);
    if (!existingRule) {
      logger.log('WARN', 'Admin', `규칙 수정 실패: 규칙을 찾을 수 없습니다 (${code})`);
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // 규칙 수정 (불량명, 임계값만 수정 가능)
    const updatedRule = {
      ...existingRule,
      name: body.name || existingRule.name,
      threshold: body.threshold || existingRule.threshold,
    };

    db.saveRule(updatedRule);
    logger.log('INFO', 'Admin', `규칙이 수정되었습니다: ${code} - ${updatedRule.name} (임계값: ${updatedRule.threshold})`);

    return NextResponse.json({ status: 'updated', rule: updatedRule });
  } catch (error: any) {
    logger.log('ERROR', 'Admin', `규칙 수정 중 오류 발생: ${error.message}`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 규칙 삭제 (DELETE)
 */
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
