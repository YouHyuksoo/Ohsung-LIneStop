/**
 * @file src/app/api/defects/resolve/route.ts
 * @description
 * 불양 해결 처리 API
 *
 * 주요 기능:
 * 1. 미해결 불양 조회 (GET)
 *    - ICOM_RECIEVE_DATA_NG 테이블에서 NG_RELEASE_YN = 'N' 조회
 *    - 최근 1시간 범위의 미해결 불양만 반환
 *
 * 2. 불양 해결 처리 (POST)
 *    Mock 모드:
 *    - 메모리의 _mockDefects 배열에서 resolved 속성 업데이트
 *
 *    실제 모드:
 *    - ICOM_RECIEVE_DATA_NG의 NG_RELEASE_YN = 'Y' 업데이트
 *    - RELEASE_TIME = SYSDATE 기록
 *    - 트랜잭션 처리: 실패 시 롤백
 *
 * 초보자 가이드:
 * - GET /api/defects/resolve: 미해결 불양 목록 조회
 * - POST /api/defects/resolve: 불양 해결 처리 (ID와 조치 사유 전달)
 *
 * Oracle DB 쿼리:
 * ```sql
 * -- 불양 해결 처리 (기존 ICOM_RECIEVE_DATA_NG 테이블만 사용)
 * UPDATE ICOM_RECIEVE_DATA_NG
 * SET NG_RELEASE_YN = 'Y',
 *     RELEASE_TIME = SYSDATE
 * WHERE ROWID IN ('AAA1234567890123', ...);
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/services/db";
import { logger } from "@/lib/services/logger";

/**
 * GET /api/defects/resolve
 * 미해결 불양(NG_RELEASE_YN = 'N')을 조회합니다.
 */
export async function GET(request: NextRequest) {
  try {
    const allDefects = await db.getAllDefectsAsync();

    // resolved가 false인 불양만 필터링
    const unresolvedDefects = allDefects.filter((d) => !d.resolved);

    logger.log(
      "INFO",
      "API",
      `미해결 불양 조회: ${unresolvedDefects.length}개`
    );

    return NextResponse.json(unresolvedDefects, { status: 200 });
  } catch (error) {
    logger.log("ERROR", "API", `미해결 불양 조회 실패: ${error}`);
    return NextResponse.json(
      { error: "미해결 불양 조회 실패" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/defects/resolve
 * 불양을 해결 처리합니다.
 *
 * Request Body:
 * {
 *   defect_ids: string[],  // 해결할 불양 ID 배열
 *   reason: string         // 조치 사유
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { defect_ids, reason } = body;

    if (!defect_ids || !Array.isArray(defect_ids) || defect_ids.length === 0) {
      return NextResponse.json(
        { error: "불양 ID 배열이 필요합니다." },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== "string") {
      return NextResponse.json(
        { error: "조치 사유가 필요합니다." },
        { status: 400 }
      );
    }

    // ⭐ DB 서비스를 통해 처리 (Mock 모드 또는 실제 모드)
    const success = await db.resolveDefectsAsync(defect_ids, reason);

    if (success) {
      logger.log(
        "INFO",
        "API",
        `불양 ${defect_ids.length}개 해결 처리 완료 (사유: ${reason})`
      );

      return NextResponse.json(
        {
          message: `불양 ${defect_ids.length}개가 해결 처리되었습니다.`,
        },
        { status: 200 }
      );
    } else {
      logger.log(
        "ERROR",
        "API",
        `불양 해결 처리 실패: ${defect_ids.length}개 (사유: ${reason})`
      );

      return NextResponse.json(
        {
          error: "불양 해결 처리 중 오류가 발생했습니다.",
          message: "관리자에게 문의하세요.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.log("ERROR", "API", `불양 해결 처리 실패: ${error}`);
    return NextResponse.json(
      { error: "불양 해결 처리 실패" },
      { status: 500 }
    );
  }
}
