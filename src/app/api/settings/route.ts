/**
 * @file src/app/api/settings/route.ts
 * @description
 * 시스템 설정 조회 및 저장 API
 *
 * 엔드포인트:
 * - GET /api/settings - 현재 설정 조회
 * - POST /api/settings - 설정 저장
 *
 * 설정 항목:
 * - polling.interval: 폴링 주기 (초)
 * - mock.plc: PLC Mock 모드
 * - mock.db: DB Mock 모드
 * - window.duration: 윈도우 시간 (시간)
 * - notification.browser: 브라우저 알림
 * - notification.sound: 소리 알림
 *
 * 주요 기능:
 * 1. **설정 조회**: settings.json 파일에서 읽기
 * 2. **설정 저장**: settings.json 파일에 쓰기
 *
 * 사용 예시:
 * - GET /api/settings
 * - POST /api/settings { polling: { interval: 2 }, ... }
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

/**
 * 설정 파일 경로
 */
const SETTINGS_FILE = path.join(process.cwd(), "settings.json");

/**
 * 기본 설정 값
 */
const DEFAULT_SETTINGS = {
  polling: {
    interval: 1, // 1초
  },
  mock: {
    plc: true,
    db: true,
  },
  window: {
    duration: 1, // 1시간
  },
  notification: {
    browser: true,
    sound: true,
  },
  plc: {
    ip: "192.168.0.1",
    port: 5000,
    address: "D100",
  },
  db: {
    host: "192.168.110.222",
    port: 1521,
    service: "OSCW",
    user: "INFINITY21_PIMMES",
    password: "",
  },
};

/**
 * 설정 파일 읽기
 */
async function readSettings() {
  try {
    const data = await fs.readFile(SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(data);
    // 새로운 필드가 없는 경우 기본값 병합
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (error) {
    // 파일이 없으면 기본 설정 반환
    console.log("[Settings] No settings file found, using defaults");
    return DEFAULT_SETTINGS;
  }
}

/**
 * 설정 파일 쓰기
 */
async function writeSettings(settings: any) {
  try {
    await fs.writeFile(
      SETTINGS_FILE,
      JSON.stringify(settings, null, 2),
      "utf-8"
    );
    console.log("[Settings] Settings saved successfully");
  } catch (error) {
    console.error("[Settings] Failed to save settings:", error);
    throw error;
  }
}

/**
 * GET /api/settings
 * 현재 설정 조회
 */
export async function GET(request: NextRequest) {
  try {
    const settings = await readSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * 설정 저장
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 기존 설정과 병합
    const currentSettings = await readSettings();
    const newSettings = { ...currentSettings, ...body };

    // 유효성 검사
    if (
      newSettings.polling?.interval < 1 ||
      newSettings.polling?.interval > 10
    ) {
      return NextResponse.json(
        { error: "Polling interval must be between 1 and 10 seconds" },
        { status: 400 }
      );
    }

    if (newSettings.window?.duration < 1 || newSettings.window?.duration > 24) {
      return NextResponse.json(
        { error: "Window duration must be between 1 and 24 hours" },
        { status: 400 }
      );
    }

    // 설정 저장
    await writeSettings(newSettings);

    console.log("[Settings] Settings updated:", newSettings);

    return NextResponse.json({
      message: "Settings saved successfully",
      settings: newSettings,
    });
  } catch (error: any) {
    console.error("Failed to save settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save settings" },
      { status: 500 }
    );
  }
}
