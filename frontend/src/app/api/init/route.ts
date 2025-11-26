/**
 * @file src/app/api/init/route.ts
 * @description
 * 서버 초기화 API
 * 모니터링 서비스를 자동으로 시작합니다.
 *
 * 이 API는 Next.js 서버 시작 시 한 번 호출되어야 합니다.
 */

import { NextResponse } from 'next/server';
import { monitorService } from '@/lib/services/monitor';

// 서버 시작 시 자동으로 모니터링 시작
monitorService.start();

export async function GET() {
  return NextResponse.json({
    message: 'Monitor service initialized',
    running: monitorService.getStatus().is_running,
  });
}
