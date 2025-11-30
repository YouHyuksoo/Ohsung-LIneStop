/**
 * @file src/app/api/auth/login/route.ts
 * @description
 * 로그인 API 엔드포인트
 *
 * POST /api/auth/login
 * - 사용자 인증 및 세션 생성
 * - 쿠키에 세션 ID 저장
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 입력값 검증
    if (!username || !password) {
      return NextResponse.json(
        { error: "사용자 이름과 비밀번호를 입력해주세요" },
        { status: 400 }
      );
    }

    // 인증 시도
    const sessionId = authenticate(username, password);

    if (!sessionId) {
      return NextResponse.json(
        { error: "사용자 이름 또는 비밀번호가 올바르지 않습니다" },
        { status: 401 }
      );
    }

    // 쿠키에 세션 ID 저장
    const cookieStore = await cookies();
    cookieStore.set("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24시간
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: "로그인 성공",
    });
  } catch (error) {
    console.error("[API] 로그인 오류:", error);
    return NextResponse.json(
      { error: "로그인 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
