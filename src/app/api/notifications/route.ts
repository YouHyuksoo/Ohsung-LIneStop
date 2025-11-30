/**
 * @file src/app/api/notifications/route.ts
 * @description
 * 알림 관리 API 엔드포인트
 *
 * GET /api/notifications - 알림 목록 조회
 * POST /api/notifications - 알림 읽음 처리
 * DELETE /api/notifications - 알림 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAllNotifications,
  getUnreadNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} from "@/lib/store/notification-store";

/**
 * GET /api/notifications
 * 알림 목록 조회
 * Query params:
 * - unread: true이면 읽지 않은 알림만 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";

    const notifications = unreadOnly
      ? getUnreadNotifications()
      : getAllNotifications();
    const unreadCount = getUnreadCount();

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("[API] 알림 조회 오류:", error);
    return NextResponse.json(
      { error: "알림 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * 알림 읽음 처리
 * Body:
 * - notificationId: 알림 ID (선택, 없으면 모든 알림 읽음 처리)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId } = body;

    if (notificationId) {
      const success = markAsRead(notificationId);
      if (!success) {
        return NextResponse.json(
          { error: "알림을 찾을 수 없습니다" },
          { status: 404 }
        );
      }
    } else {
      markAllAsRead();
    }

    return NextResponse.json({
      success: true,
      message: "알림이 읽음 처리되었습니다",
    });
  } catch (error) {
    console.error("[API] 알림 읽음 처리 오류:", error);
    return NextResponse.json(
      { error: "알림 읽음 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications
 * 알림 삭제
 * Query params:
 * - id: 알림 ID (선택, 없으면 모든 알림 삭제)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");

    if (notificationId) {
      const success = deleteNotification(notificationId);
      if (!success) {
        return NextResponse.json(
          { error: "알림을 찾을 수 없습니다" },
          { status: 404 }
        );
      }
    } else {
      deleteAllNotifications();
    }

    return NextResponse.json({
      success: true,
      message: "알림이 삭제되었습니다",
    });
  } catch (error) {
    console.error("[API] 알림 삭제 오류:", error);
    return NextResponse.json(
      { error: "알림 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
