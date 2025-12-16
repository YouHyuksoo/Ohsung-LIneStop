/**
 * @file src/app/api/db-test/route.ts
 * @description
 * 데이터베이스 연결 테스트 API
 * Settings 페이지에서 DB 연결을 테스트합니다.
 *
 * 주요 기능:
 * 1. **DB 연결 시뮬레이션**: Mock 모드에서는 항상 성공
 * 2. **실제 연결 테스트**: 실제 DB 모드에서는 연결 시도
 * 3. **응답**: 성공/실패 메시지 반환
 *
 * 사용법:
 * - GET /api/db-test
 *
 * @example
 * // 요청
 * GET /api/db-test
 *
 * // 성공 응답
 * {
 *   "success": true,
 *   "message": "DB 연결에 성공했습니다."
 * }
 *
 * // 실패 응답
 * {
 *   "success": false,
 *   "message": "DB 연결에 실패했습니다."
 * }
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/services/db";
import { logger } from "@/lib/services/logger";

/**
 * GET /api/db-test
 * 데이터베이스 연결 테스트
 */
export async function GET() {
  try {
    // 1. Mock 모드 확인
    if (db.isMockMode) {
      logger.log("INFO", "API", "DB Mock 모드 테스트 수행");

      return NextResponse.json(
        {
          success: true,
          message: "DB Mock 모드로 실행 중입니다. (실제 연결 없음)",
          mockMode: true,
        },
        { status: 200 }
      );
    }

    // 2. 실제 DB 모드: 연결 테스트 수행
    await db.testConnection();

    logger.log("INFO", "API", "DB 연결 테스트 수행 성공");

    return NextResponse.json(
      {
        success: true,
        message: "DB 연결에 성공했습니다.",
        mockMode: false,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 오류";

    logger.log("ERROR", "API", `DB 연결 테스트 실패: ${errorMessage}`);

    return NextResponse.json(
      {
        success: false,
        message: `DB 연결에 실패했습니다: ${errorMessage}`,
        mockMode: db.isMockMode,
      },
      { status: 500 }
    );
  }
}
