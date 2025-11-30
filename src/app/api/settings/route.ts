/**
 * @file src/app/api/settings/route.ts
 * @description 설정 읽기/쓰기 API
 */
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSettings } from "@/lib/settings";
import { validateSession } from "@/lib/auth";
import { cookies } from "next/headers";

const settingsFilePath = path.join(process.cwd(), "settings.json");

/**
 * 세션 검증 헬퍼 함수
 */
async function checkAuth() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;
  const user = validateSession(sessionId);
  return user;
}

/**
 * GET /api/settings
 * 현재 설정을 불러옵니다.
 */
export async function GET() {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json(
        { message: "인증되지 않은 사용자입니다." },
        { status: 401 }
      );
    }

    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json(
      { message: `설정 불러오기 실패: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * 새로운 설정을 저장합니다.
 */
export async function POST(request: Request) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json(
        { message: "인증되지 않은 사용자입니다." },
        { status: 401 }
      );
    }

    const newSettings = await request.json();
    await fs.writeFile(settingsFilePath, JSON.stringify(newSettings, null, 2));
    return NextResponse.json({ message: "설정이 저장되었습니다." });
  } catch (error: any) {
    return NextResponse.json(
      { message: `설정 저장 실패: ${error.message}` },
      { status: 500 }
    );
  }
}
