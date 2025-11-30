/**
 * @file src/app/api/auth/me/route.ts
 * @description
 * 현재 사용자 정보 조회 API 엔드포인트
 *
 * GET /api/auth/me
 * - 세션에서 사용자 정보 반환
 */

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    const user = validateSession(sessionId);

    if (!user) {
      return NextResponse.json(
        { error: "인증되지 않은 사용자입니다" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user,
    });
  } catch (error) {
    console.error("[API] 사용자 정보 조회 오류:", error);
    return NextResponse.json(
      { error: "사용자 정보 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
