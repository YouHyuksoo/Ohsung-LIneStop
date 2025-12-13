/**
 * @file src/app/api/settings/route.ts
 * @description 설정 읽기/쓰기 API
 *
 * ⭐ UPDATE: POST 요청 시 싱글톤 인스턴스 재로드
 * - DB와 PLC 모드 설정 변경 시 메모리의 싱글톤 인스턴스를 즉시 업데이트합니다.
 */
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/services/db";
import { plc } from "@/lib/services/plc";
import { logger } from "@/lib/services/logger";

export const dynamic = "force-dynamic";

const settingsFilePath = path.join(process.cwd(), "settings.json");

/**
 * 세션 검증 헬퍼 함수
 * NOTE: 로그인 기능이 제거되어 항상 성공하도록 처리
 */
async function checkAuth() {
  // 로그인 기능 제거로 항상 true 반환
  return true;
}

/**
 * GET /api/settings
 * 현재 설정을 불러옵니다.
 */
export async function GET() {
  try {
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
 * 새로운 설정을 저장하고 싱글톤 인스턴스를 재로드합니다.
 * ⭐ NEW: 설정 변경 후 메모리의 db, plc 인스턴스를 즉시 업데이트합니다.
 */
export async function POST(request: Request) {
  try {
    const newSettings = await request.json();

    // 설정 파일에 저장
    await fs.writeFile(settingsFilePath, JSON.stringify(newSettings, null, 2));

    // ⭐ NEW: DB와 PLC의 싱글톤 인스턴스에 설정 파일 재로드 (메모리 업데이트)
    db.reloadSettings();
    plc.reloadSettings();

    // Logger에 기록
    logger.log(
      "INFO",
      "API",
      "설정이 저장되고 싱글톤 인스턴스가 재로드되었습니다."
    );

    return NextResponse.json({ message: "설정이 저장되었습니다." });
  } catch (error: any) {
    logger.log("ERROR", "API", `설정 저장 실패: ${error.message}`);
    return NextResponse.json(
      { message: `설정 저장 실패: ${error.message}` },
      { status: 500 }
    );
  }
}
