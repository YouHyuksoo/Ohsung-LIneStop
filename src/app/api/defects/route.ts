import { NextRequest, NextResponse } from "next/server";
import { startOfDay, endOfDay, parseISO, isValid } from "date-fns";
import { db } from "@/lib/services/db";
import { logger } from "@/lib/services/logger";

interface Defect {
  id: string;
  code: string;
  name: string;
  timestamp: string;
  resolved: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const code = searchParams.get("code");

    let defects: Defect[];

    // Mock 모드 확인
    if (db.isMockMode) {
      // Mock 모드: 메모리에 저장된 Mock 불량 반환
      defects = db.mockDefects;
      logger.log("INFO", "API", `Mock 모드에서 불량 ${defects.length}개 조회`);
    } else {
      // 실제 모드: Oracle DB에서 비동기로 조회
      defects = await db.getAllDefectsAsync();
      logger.log("INFO", "API", `Oracle DB에서 불량 ${defects.length}개 조회`);
    }

    let filteredDefects = [...defects];

    // 1. 날짜 필터링
    if (startDateStr && endDateStr) {
      const start = startOfDay(parseISO(startDateStr));
      const end = endOfDay(parseISO(endDateStr));

      if (isValid(start) && isValid(end)) {
        filteredDefects = filteredDefects.filter((defect) => {
          const defectDate = new Date(defect.timestamp);
          return defectDate >= start && defectDate <= end;
        });
      }
    }

    // 2. 불량 코드 필터링
    if (code) {
      filteredDefects = filteredDefects.filter(
        (defect) => defect.code === code
      );
    }

    logger.log(
      "INFO",
      "API",
      `필터링 후 ${
        filteredDefects.length
      }개 데이터 반환. 조건: ${JSON.stringify({
        startDate: startDateStr,
        endDate: endDateStr,
        code,
      })}`
    );

    return NextResponse.json(filteredDefects);
  } catch (error: any) {
    logger.log("ERROR", "API", `불량 조회 실패: ${error.message}`);
    console.error("[API] Failed to fetch defects:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch defects" },
      { status: 500 }
    );
  }
}
