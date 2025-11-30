/**
 * @file src/lib/store/session-store.ts
 * @description
 * 세션 데이터 저장소
 * 메모리 기반으로 사용자 세션을 관리합니다.
 *
 * 주요 기능:
 * - 세션 생성 및 저장
 * - 세션 조회 및 검증
 * - 세션 삭제
 * - 만료된 세션 자동 정리
 */

import { Session, User } from "../types";

/**
 * 세션 저장소 (메모리 기반)
 * key: 세션 ID, value: 세션 정보
 *
 * 개발 환경에서 서버가 재시작되어도 세션을 유지하기 위해 global 객체를 사용합니다.
 */
const globalForSessions = global as unknown as {
  sessions: Map<string, Session>;
};

const sessions = globalForSessions.sessions || new Map<string, Session>();

if (process.env.NODE_ENV !== "production") {
  globalForSessions.sessions = sessions;
}

/**
 * 세션 ID 생성
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * 새 세션 생성
 * @param user 사용자 정보
 * @returns 생성된 세션
 */
export function createSession(user: User): Session {
  const sessionId = generateSessionId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24시간 후 만료

  const session: Session = {
    id: sessionId,
    user,
    createdAt: now,
    expiresAt,
  };

  sessions.set(sessionId, session);
  console.log(
    `[SessionStore] 세션 생성: ${sessionId} (사용자: ${user.username})`
  );

  return session;
}

/**
 * 세션 조회
 * @param sessionId 세션 ID
 * @returns 세션 정보 또는 null
 */
export function getSession(sessionId: string): Session | null {
  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  // 만료 확인
  if (new Date() > session.expiresAt) {
    console.log(`[SessionStore] 만료된 세션 삭제: ${sessionId}`);
    sessions.delete(sessionId);
    return null;
  }

  return session;
}

/**
 * 세션 삭제
 * @param sessionId 세션 ID
 */
export function deleteSession(sessionId: string): void {
  const deleted = sessions.delete(sessionId);
  if (deleted) {
    console.log(`[SessionStore] 세션 삭제: ${sessionId}`);
  }
}

/**
 * 만료된 세션 정리
 * 주기적으로 호출하여 만료된 세션을 삭제합니다.
 */
export function cleanupExpiredSessions(): void {
  const now = new Date();
  let count = 0;

  for (const [sessionId, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(sessionId);
      count++;
    }
  }

  if (count > 0) {
    console.log(`[SessionStore] 만료된 세션 ${count}개 정리됨`);
  }
}

// 1시간마다 만료된 세션 정리
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
