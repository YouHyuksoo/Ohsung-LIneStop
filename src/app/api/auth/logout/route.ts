/**
 * @file src/app/api/auth/logout/route.ts
 * @description
 * 로그아웃 API 엔드포인트
 *
 * POST /api/auth/logout
 * - 세션 삭제
 * - 쿠키 제거
 */

import { NextRequest, NextResponse } from "next/server";
import { logout } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    if (sessionId) {
      logout(sessionId);
    }

    // 쿠키 삭제
    cookieStore.delete("session_id");

    return NextResponse.json({
      success: true,
      message: "로그아웃 성공",
    });
  } catch (error) {
    console.error("[API] 로그아웃 오류:", error);
    return NextResponse.json(
      { error: "로그아웃 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
