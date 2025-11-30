/**
 * @file src/lib/store/notification-store.ts
 * @description
 * 알림 데이터 저장소
 * 메모리 기반으로 시스템 알림을 관리합니다.
 *
 * 주요 기능:
 * - 알림 생성 및 저장
 * - 알림 조회 (전체/읽지 않은 알림)
 * - 알림 읽음 처리
 * - 알림 삭제
 * - 최대 100개 유지
 */

import { Notification, NotificationType } from "../types";

/**
 * 알림 저장소 (메모리 기반)
 * 최신 알림이 앞에 오도록 정렬
 */
let notifications: Notification[] = [];

/**
 * 알림 ID 생성
 */
function generateNotificationId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * 새 알림 생성
 * @param type 알림 타입
 * @param title 알림 제목
 * @param message 알림 메시지
 * @param data 추가 데이터
 * @returns 생성된 알림
 */
export function createNotification(
  type: NotificationType,
  title: string,
  message: string,
  data?: any
): Notification {
  const notification: Notification = {
    id: generateNotificationId(),
    type,
    title,
    message,
    timestamp: new Date(),
    isRead: false,
    data,
  };

  // 최신 알림을 앞에 추가
  notifications.unshift(notification);

  // 최대 100개 유지
  if (notifications.length > 100) {
    notifications = notifications.slice(0, 100);
  }

  console.log(`[NotificationStore] 알림 생성: ${type} - ${title}`);

  return notification;
}

/**
 * 모든 알림 조회
 * @returns 알림 목록
 */
export function getAllNotifications(): Notification[] {
  return [...notifications];
}

/**
 * 읽지 않은 알림 조회
 * @returns 읽지 않은 알림 목록
 */
export function getUnreadNotifications(): Notification[] {
  return notifications.filter((n) => !n.isRead);
}

/**
 * 읽지 않은 알림 개수 조회
 * @returns 읽지 않은 알림 개수
 */
export function getUnreadCount(): number {
  return notifications.filter((n) => !n.isRead).length;
}

/**
 * 알림 읽음 처리
 * @param notificationId 알림 ID
 * @returns 성공 여부
 */
export function markAsRead(notificationId: string): boolean {
  const notification = notifications.find((n) => n.id === notificationId);

  if (!notification) {
    return false;
  }

  notification.isRead = true;
  console.log(`[NotificationStore] 알림 읽음 처리: ${notificationId}`);

  return true;
}

/**
 * 모든 알림 읽음 처리
 */
export function markAllAsRead(): void {
  notifications.forEach((n) => (n.isRead = true));
  console.log(`[NotificationStore] 모든 알림 읽음 처리`);
}

/**
 * 알림 삭제
 * @param notificationId 알림 ID
 * @returns 성공 여부
 */
export function deleteNotification(notificationId: string): boolean {
  const index = notifications.findIndex((n) => n.id === notificationId);

  if (index === -1) {
    return false;
  }

  notifications.splice(index, 1);
  console.log(`[NotificationStore] 알림 삭제: ${notificationId}`);

  return true;
}

/**
 * 모든 알림 삭제
 */
export function deleteAllNotifications(): void {
  notifications = [];
  console.log(`[NotificationStore] 모든 알림 삭제`);
}
