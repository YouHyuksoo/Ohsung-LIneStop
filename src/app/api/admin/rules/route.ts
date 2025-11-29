/**
 * @file src/app/api/admin/rules/route.ts
 * @description
 * 불량 규칙 관리 API
 *
 * GET /api/admin/rules - 모든 규칙 조회
 * POST /api/admin/rules - 새 규칙 추가
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/services/db';
import { logger } from '@/lib/services/logger';
import { DefectRule } from '@/lib/types';

/**
 * GET /api/admin/rules
 * 모든 불량 규칙을 조회합니다.
 */
export async function GET() {
  const rules = db.getRules();
  return NextResponse.json(rules);
}

/**
 * POST /api/admin/rules
 * 새로운 불량 규칙을 추가합니다.
 *
 * Request Body: DefectRule
 */
export async function POST(request: NextRequest) {
  try {
    const rule: DefectRule = await request.json();
    db.saveRule(rule);
    logger.log('INFO', 'Admin', `관리자가 규칙을 추가했습니다: ${rule.code} - ${rule.name}`);

    return NextResponse.json({
      status: 'created',
      rule,
    });
  } catch (error: any) {
    logger.log('ERROR', 'Admin', `규칙 추가 중 오류 발생: ${error.message}`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
