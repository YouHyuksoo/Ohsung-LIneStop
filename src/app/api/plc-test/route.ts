/**
 * @file src/app/api/plc-test/route.ts
 * @description
 * ⭐ NEW: PLC 연결 테스트 API (2단계)
 * Settings 페이지에서 PLC 연결을 2단계로 테스트합니다.
 *
 * 2단계 테스트:
 * 1. **Ping 테스트**: TCP 포트 연결 가능 여부 확인 (5초 타임아웃)
 *    - 성공: 네트워크가 정상이고 PLC이 응답함
 *    - 실패: IP/포트가 잘못되거나 PLC이 꺼져있음
 * 2. **접속 테스트**: MC Protocol 초기화 및 데이터 읽기 (10초 타임아웃)
 *    - 성공: PLC과 정상 통신 가능
 *    - 실패: MC Protocol 미지원 또는 설정 오류
 *
 * 쿼리 파라미터:
 * - ?step=ping   : Ping 테스트만 수행
 * - ?step=connect: Ping 성공 후 접속 테스트 수행
 * - ?step=all    : 전체 테스트 수행 (기본값)
 *
 * 사용법:
 * - GET /api/plc-test
 * - GET /api/plc-test?step=ping
 * - GET /api/plc-test?step=connect
 * - GET /api/plc-test?step=all
 *
 * @example
 * // Ping 테스트만 수행
 * GET /api/plc-test?step=ping
 * {
 *   "step": "ping",
 *   "success": true,
 *   "message": "Ping 성공 (192.168.151.27:5012)",
 *   "latency": 45,
 *   "mockMode": false
 * }
 *
 * // Ping 성공 후 접속 테스트 수행
 * GET /api/plc-test?step=connect
 * {
 *   "step": "connect",
 *   "pingResult": { "success": true, "latency": 45, "message": "..." },
 *   "connectionResult": { "success": true, "version": "MC Protocol 3E", "message": "..." },
 *   "success": true,
 *   "message": "PLC 접속 성공",
 *   "mockMode": false
 * }
 *
 * // 전체 테스트
 * GET /api/plc-test?step=all
 * {
 *   "step": "all",
 *   "stages": [
 *     { "name": "Ping 테스트", "success": true, ... },
 *     { "name": "접속 테스트", "success": true, ... }
 *   ],
 *   "success": true,
 *   "message": "모든 테스트 완료",
 *   "mockMode": false
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { plc } from "@/lib/services/plc";
import { logger } from "@/lib/services/logger";

/**
 * GET /api/plc-test
 * PLC 연결 테스트 (2단계: Ping → 접속)
 */
export async function GET(request: NextRequest) {
  try {
    // 쿼리 파라미터에서 step 확인
    const step = request.nextUrl.searchParams.get("step") || "all";

    // Mock 모드 처리
    if (plc.isMockMode) {
      logger.log("INFO", "API", `PLC Mock 모드 - ${step} 테스트 스킵`);

      return NextResponse.json(
        {
          step: step,
          success: true,
          message: "PLC Mock 모드로 실행 중입니다. (실제 연결 없음)",
          mockMode: true,
          note: "실제 테스트를 수행하려면 Settings에서 Mock 모드를 비활성화하세요.",
        },
        { status: 200 }
      );
    }

    // ==========================================
    // 1단계: Ping 테스트
    // ==========================================
    if (step === "ping" || step === "all") {
      logger.log("INFO", "API", "🔍 PLC Ping 테스트 시작");

      const pingResult = await plc.testPing();

      if (step === "ping") {
        return NextResponse.json(
          {
            step: "ping",
            success: pingResult.success,
            message: pingResult.message,
            latency: pingResult.latency,
            mockMode: false,
          },
          { status: pingResult.success ? 200 : 500 }
        );
      }

      // step === "all"인 경우
      if (!pingResult.success) {
        logger.log(
          "WARN",
          "API",
          `🔍 Ping 테스트 실패 - 접속 테스트 스킵: ${pingResult.message}`
        );

        return NextResponse.json(
          {
            step: "all",
            stages: [
              {
                name: "Ping 테스트",
                success: false,
                message: pingResult.message,
                latency: pingResult.latency,
              },
              {
                name: "접속 테스트",
                success: false,
                message: "Ping 테스트 실패로 인해 스킵됨",
              },
            ],
            success: false,
            message: `PLC 테스트 실패: ${pingResult.message}`,
            mockMode: false,
          },
          { status: 500 }
        );
      }

      // ==========================================
      // 2단계: 접속 테스트
      // ==========================================
      logger.log(
        "INFO",
        "API",
        `🔍 Ping 성공! (${pingResult.latency}ms) - 🔌 접속 테스트 시작`
      );

      const connectionResult = await plc.testConnection();

      logger.log(
        connectionResult.success ? "INFO" : "WARN",
        "API",
        `🔌 접속 테스트 완료: ${connectionResult.message}`
      );

      return NextResponse.json(
        {
          step: "all",
          stages: [
            {
              name: "Ping 테스트",
              success: true,
              message: pingResult.message,
              latency: pingResult.latency,
            },
            {
              name: "접속 테스트",
              success: connectionResult.success,
              message: connectionResult.message,
              version: connectionResult.version,
            },
          ],
          success: connectionResult.success,
          message: connectionResult.success
            ? "PLC 연결 성공 (모든 테스트 통과)"
            : `PLC 접속 테스트 실패: ${connectionResult.message}`,
          mockMode: false,
        },
        { status: connectionResult.success ? 200 : 500 }
      );
    }

    // ==========================================
    // Connect 단계만 수행 (Ping 없음)
    // ==========================================
    if (step === "connect") {
      logger.log("INFO", "API", "🔌 PLC 접속 테스트 시작 (Ping 스킵)");

      const connectionResult = await plc.testConnection();

      return NextResponse.json(
        {
          step: "connect",
          success: connectionResult.success,
          message: connectionResult.message,
          version: connectionResult.version,
          mockMode: false,
        },
        { status: connectionResult.success ? 200 : 500 }
      );
    }

    // 잘못된 step 파라미터
    throw new Error(
      `잘못된 step 파라미터: ${step} (ping, connect, all만 허용)`
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 오류";

    logger.log("ERROR", "API", `PLC 테스트 중 예외 발생: ${errorMessage}`);

    return NextResponse.json(
      {
        success: false,
        message: `PLC 테스트 실패: ${errorMessage}`,
        mockMode: plc.isMockMode,
      },
      { status: 500 }
    );
  }
}
