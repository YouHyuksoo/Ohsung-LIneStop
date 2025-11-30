/**
 * @file src/lib/settings.ts
 * @description 설정 파일(settings.json) 읽기/쓰기 유틸리티
 */
import fs from "fs/promises";
import path from "path";

interface Settings {
  polling: { interval: number };
  mock: {
    plc: boolean;
    db: boolean;
    db_defect_probability?: number;
  };
  window: { duration: number };
  notification: { browser: boolean; sound: boolean };
  plc?: { ip: string; port: number; address: string };
  db?: {
    host: string;
    port: number;
    service: string;
    user: string;
    password: string;
  };
}

const settingsFilePath = path.join(process.cwd(), "settings.json");

/**
 * settings.json 파일에서 설정을 읽어옵니다.
 */
export async function getSettings(): Promise<Settings> {
  try {
    const fileContent = await fs.readFile(settingsFilePath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("설정 파일을 읽는 중 오류 발생:", error);
    // 파일이 없거나 읽을 수 없을 경우 기본값을 반환하거나 에러를 던질 수 있습니다.
    // 여기서는 빈 객체를 반환하여 각 API 핸들러가 처리하도록 합니다.
    return {} as Settings;
  }
}
