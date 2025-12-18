/**
 * @file src/app/api/plc-control/route.ts
 * @description
 * PLC 제어 API (POST /api/plc-control)
 *
 * 주소에 특정 값(0, 1, 2)을 쓰는 테스트 기능
 * 0: 해제 (라인 가동)
 * 1: 경고 (알람)
 * 2: 정지
 *
 * Request Body:
 * {
 *   "address": "D7000",
 *   "value": 0 | 1 | 2
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { plc } from "@/lib/services/plc";
import { logger } from "@/lib/services/logger";

/**
 * POST /api/plc-control
 * PLC 주소에 값 쓰기 (제어 테스트)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, value } = body;

    // 유효성 검사
    if (!address) {
      logger.log("WARN", "API", "PLC 제어 요청: 주소가 없습니다");
      return NextResponse.json(
        {
          success: false,
          message: "주소가 필요합니다",
        },
        { status: 400 }
      );
    }

    if (![0, 1, 2].includes(value)) {
      logger.log(
        "WARN",
        "API",
        `PLC 제어 요청: 잘못된 값 (${value}) - 0, 1, 2만 허용`
      );
      return NextResponse.json(
        {
          success: false,
          message: "값은 0(해제), 1(경고), 2(정지)만 허용됩니다",
        },
        { status: 400 }
      );
    }

    // PLC Mock 모드 확인
    if (plc.isMockMode) {
      const actionLabels: Record<number, string> = {
        0: "해제 (라인 가동)",
        1: "경고 (알람)",
        2: "정지",
      };

      logger.log(
        "INFO",
        "API",
        `PLC Mock 모드: ${address}에 ${value}(${actionLabels[value]}) 쓰기`
      );

      // Mock 모드에서는 해당 값으로 상태 변경
      if (value === 0) {
        // 해제 - resetLine 호출
        await plc.resetLine();
      } else if (value === 1) {
        // 경고 - warnLine 호출
        await plc.warnLine("Settings 페이지 테스트");
      } else if (value === 2) {
        // 정지 - stopLine 호출
        await plc.stopLine("Settings 페이지 테스트");
      }

      return NextResponse.json(
        {
          success: true,
          message: `Mock 모드: ${address}에 ${value}(${actionLabels[value]}) 신호를 전송했습니다`,
          address,
          value,
          mockMode: true,
        },
        { status: 200 }
      );
    }

    // 실제 PLC 제어
    const actionLabels: Record<number, string> = {
      0: "해제 (라인 가동)",
      1: "경고 (알람)",
      2: "정지",
    };

    logger.log(
      "INFO",
      "API",
      `PLC 제어: ${address}에 ${value}(${actionLabels[value]}) 쓰기 시작`
    );

    // 연결 확인
    if (!plc.connected) {
      await plc.connect();
    }

    try {
      // mcprotocol의 writeItems 사용
      await new Promise<void>((resolve, reject) => {
        const client = (plc as any).client;
        if (!client) {
          reject(new Error("PLC 클라이언트가 초기화되지 않았습니다"));
          return;
        }

        client.writeItems(address, value, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      logger.log(
        "INFO",
        "API",
        `PLC 제어 성공: ${address}에 ${value}(${actionLabels[value]}) 전송`
      );

      return NextResponse.json(
        {
          success: true,
          message: `${address}에 ${value}(${actionLabels[value]}) 신호를 전송했습니다`,
          address,
          value,
          mockMode: false,
        },
        { status: 200 }
      );
    } catch (error) {
      logger.log(
        "ERROR",
        "API",
        `PLC 제어 실패: ${address}에 ${value} 쓰기 - ${error}`
      );

      return NextResponse.json(
        {
          success: false,
          message: `PLC에 값을 쓸 수 없습니다: ${error}`,
          address,
          value,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 오류";

    logger.log("ERROR", "API", `PLC 제어 중 예외 발생: ${errorMessage}`);

    return NextResponse.json(
      {
        success: false,
        message: `PLC 제어 실패: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
