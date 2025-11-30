/**
 * @file src/app/api/plc-test/route.ts
 * @description
 * PLC 연결 테스트 API
 * Settings 페이지에서 PLC 연결을 테스트합니다.
 *
 * 주요 기능:
 * 1. **PLC 연결 시뮬레이션**: Mock 모드에서는 항상 성공
 * 2. **실제 연결 테스트**: 실제 PLC 모드에서는 연결 시도
 * 3. **응답**: 성공/실패 메시지 반환
 *
 * 사용법:
 * - GET /api/plc-test
 *
 * @example
 * // 요청
 * GET /api/plc-test
 *
 * // 성공 응답
 * {
 *   "success": true,
 *   "message": "PLC 연결에 성공했습니다."
 * }
 *
 * // 실패 응답
 * {
 *   "success": false,
 *   "message": "PLC 연결에 실패했습니다."
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { plc } from "@/lib/services/plc";
import { logger } from "@/lib/services/logger";

/**
 * GET /api/plc-test
 * PLC 연결 테스트
 */
export async function GET(request: NextRequest) {
  try {
    // PLC 상태 확인 (Mock 모드에서는 항상 성공)
    const status = plc.readStatus();

    logger.log("INFO", "API", "PLC 연결 테스트 수행");

    return NextResponse.json(
      {
        success: true,
        message: "PLC 연결에 성공했습니다.",
        status: status,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 오류";

    logger.log("ERROR", "API", `PLC 연결 테스트 실패: ${errorMessage}`);

    return NextResponse.json(
      {
        success: false,
        message: `PLC 연결에 실패했습니다: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
