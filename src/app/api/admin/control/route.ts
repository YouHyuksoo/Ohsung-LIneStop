/**
 * @file src/app/api/admin/control/route.ts
 * @description
 * POST /api/admin/control - 모니터링 서비스 시작/정지 API
 *
 * Request Body:
 * {
 *   "action": "start" | "stop"
 * }
 *
 * Response:
 * {
 *   "status": "ok",
 *   "running": boolean
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { monitorService } from "@/lib/services/monitor";
import { plc } from "@/lib/services/plc";
import { logger } from "@/lib/services/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "start") {
      monitorService.start();
      logger.log("INFO", "API", "관리자가 모니터링 서비스를 시작했습니다.");
    } else if (action === "stop") {
      monitorService.stop();
      logger.log("INFO", "API", "관리자가 모니터링 서비스를 정지했습니다.");
    } else if (action === "force_stop") {
      await plc.stopLine("관리자 강제 정지");
      // 모니터링 서비스에도 상태 반영 (선택 사항, 하지만 일관성을 위해 권장)
      // monitorService.recordPlcStop(); // monitorService에 public 메서드로 노출 필요할 수 있음
      logger.log("WARN", "API", "관리자가 PLC를 강제 정지했습니다.");
    } else if (action === "force_reset") {
      await plc.resetLine();
      logger.log("INFO", "API", "관리자가 PLC를 강제 해제(재가동)했습니다.");
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({
      status: "ok",
      running: monitorService.getStatus().is_running,
    });
  } catch (error: any) {
    logger.log("ERROR", "API", `서비스 제어 중 오류 발생: ${error.message}`);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
