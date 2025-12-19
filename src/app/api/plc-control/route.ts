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
 *   "address": "D7000,1",  // mcprotocol 형식: D7000 1개 단어
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

    // 실제 PLC 제어 - 새 PLCClient 인스턴스 사용 (최신 설정 적용)
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

    try {
      // 설정 파일에서 PLC 설정 로드
      const fs = await import("fs");
      const path = await import("path");
      const settingsFile = path.join(process.cwd(), "settings.json");
      let plcConfig = {
        ip: "192.168.151.27",
        port: 5012,
        ascii: false,
        frame: "3E",
        plcType: "Q",
        network: 0,
        station: 0,
      };

      if (fs.existsSync(settingsFile)) {
        const data = fs.readFileSync(settingsFile, "utf-8");
        const settings = JSON.parse(data);
        if (settings.plc) {
          plcConfig = {
            ip: settings.plc.ip || plcConfig.ip,
            port: settings.plc.port || plcConfig.port,
            ascii: settings.plc.ascii ?? plcConfig.ascii,
            frame: settings.plc.frame || plcConfig.frame,
            plcType: settings.plc.plcType || plcConfig.plcType,
            network: settings.plc.network ?? plcConfig.network,
            station: settings.plc.station ?? plcConfig.station,
          };
        }
      }

      // 상세 로그 출력
      const configSummary = {
        ...plcConfig,
        address,
        value,
      };
      logger.log("DEBUG", "API", `PLC 제어 설정: ${JSON.stringify(configSummary)}`);
      console.log("[PLC Control] 설정:", configSummary);

      // melsec-connect PLCClient 사용
      const { PLCClient } = require("melsec-connect");
      const controlClient = new PLCClient({
        host: plcConfig.ip,
        port: plcConfig.port,
        ascii: plcConfig.ascii,
        frame: plcConfig.frame,
        plcType: plcConfig.plcType,
        network: plcConfig.network,
        PLCStation: plcConfig.station,
        timeout: 10000,
        logLevel: "DEBUG",
      });

      // 연결
      await controlClient.connect();

      // 값 쓰기
      const writeResult = await controlClient.write([
        { name: address, value: value },
      ]);

      // 연결 종료
      await controlClient.disconnect();

      // 결과 확인
      const resultData = writeResult.results?.[address];
      if (writeResult.success && !resultData?.error) {
        logger.log(
          "DEBUG",
          "API",
          `PLC 제어: 쓰기 성공 (${address}에 ${value})`
        );
      } else {
        const errorMsg = resultData?.error || "알 수 없는 오류";
        logger.log(
          "WARN",
          "API",
          `PLC 제어: 쓰기 에러 (${address}에 ${value}) - ${errorMsg}`
        );
      }

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
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.log(
        "ERROR",
        "API",
        `PLC 제어 실패: ${address}에 ${value} 쓰기 - ${errorMessage}`
      );

      return NextResponse.json(
        {
          success: false,
          message: `PLC에 값을 쓸 수 없습니다: ${errorMessage}`,
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
