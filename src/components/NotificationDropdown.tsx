/**
 * @file src/components/NotificationDropdown.tsx
 * @description
 * 알림 드롭다운 컴포넌트
 *
 * 기능:
 * - 알림 목록 표시
 * - 읽음/안읽음 상태 표시
 * - 알림 타입별 아이콘 및 색상
 * - 알림 삭제 기능
 * - 모두 읽음 처리
 */

"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  X,
  AlertTriangle,
  CheckCircle,
  Play,
  Square,
} from "lucide-react";
import { Notification } from "@/lib/types";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // 알림 조회
  const fetchNotifications = async () => {
    try {
      const response = await axios.get("/api/notifications");
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error("알림 조회 실패:", error);
    }
  };

  // 주기적으로 알림 조회 (5초마다)
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  // 알림 읽음 처리
  const markAsRead = async (notificationId: string) => {
    try {
      await axios.post("/api/notifications", { notificationId });
      fetchNotifications();
    } catch (error) {
      console.error("알림 읽음 처리 실패:", error);
    }
  };

  // 모든 알림 읽음 처리
  const markAllAsRead = async () => {
    try {
      await axios.post("/api/notifications", {});
      fetchNotifications();
    } catch (error) {
      console.error("모든 알림 읽음 처리 실패:", error);
    }
  };

  // 알림 삭제
  const deleteNotification = async (notificationId: string) => {
    try {
      await axios.delete(`/api/notifications?id=${notificationId}`);
      fetchNotifications();
    } catch (error) {
      console.error("알림 삭제 실패:", error);
    }
  };

  // 알림 타입별 아이콘
  const getIcon = (type: string) => {
    switch (type) {
      case "LINE_STOP":
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case "LINE_RESUME":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "SERVICE_START":
        return <Play className="w-5 h-5 text-blue-500" />;
      case "SERVICE_STOP":
        return <Square className="w-5 h-5 text-gray-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="relative">
      {/* 알림 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
        title="알림"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* 드롭다운 */}
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 알림 목록 */}
          <div className="absolute right-0 mt-2 w-96 bg-card border border-border rounded-lg shadow-lg z-50 max-h-[500px] overflow-hidden flex flex-col">
            {/* 헤더 */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-lg">알림</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-500 hover:text-blue-600"
                >
                  모두 읽음
                </button>
              )}
            </div>

            {/* 알림 목록 */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  알림이 없습니다
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-border hover:bg-secondary/30 transition-colors cursor-pointer ${
                      !notification.isRead ? "bg-blue-500/5" : ""
                    }`}
                    onClick={() => {
                      if (!notification.isRead) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* 아이콘 */}
                      <div className="mt-0.5">{getIcon(notification.type)}</div>

                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm">
                            {notification.title}
                          </h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(
                            new Date(notification.timestamp),
                            {
                              addSuffix: true,
                              locale: ko,
                            }
                          )}
                        </p>
                      </div>

                      {/* 읽지 않음 표시 */}
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
