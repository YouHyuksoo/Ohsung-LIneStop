/**
 * @file src/app/api/notifications/stream/route.ts
 * @description
 * SSE (Server-Sent Events) 엔드포인트
 *
 * 실시간 알림 푸시를 위한 스트림 연결
 * - 클라이언트가 연결하면 스트림 유지
 * - 새 알림 발생 시 즉시 전송
 * - 폴링 불필요
 */

import { NextRequest } from "next/server";
import {
  notificationEmitter,
  getAllNotifications,
  getUnreadCount,
} from "@/lib/store/notification-store";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications/stream
 * SSE 스트림 연결
 */
export async function GET(request: NextRequest) {
  // SSE 헤더 설정
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 초기 데이터 전송
      const initialData = {
        notifications: getAllNotifications(),
        unreadCount: getUnreadCount(),
      };

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`)
      );

      // 새 알림 이벤트 리스너
      const onNotification = (data: any) => {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              notifications: getAllNotifications(),
              unreadCount: data.unreadCount,
            })}\n\n`
          )
        );
      };

      notificationEmitter.on("notification", onNotification);

      // Keep-alive (30초마다 핑)
      const keepAliveInterval = setInterval(() => {
        controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 30000);

      // 연결 종료 시 정리
      request.signal.addEventListener("abort", () => {
        notificationEmitter.off("notification", onNotification);
        clearInterval(keepAliveInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Nginx 버퍼링 비활성화
    },
  });
}
