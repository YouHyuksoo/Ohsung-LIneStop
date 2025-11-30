/**
 * @file src/lib/auth.ts
 * @description
 * 인증 관련 유틸리티 함수
 *
 * 주요 기능:
 * - 사용자 인증 (로그인)
 * - 세션 검증
 * - 하드코딩된 관리자 계정 관리
 */

import { User } from "./types";
import {
  createSession,
  getSession,
  deleteSession,
} from "./store/session-store";

/**
 * 하드코딩된 사용자 정보
 * 실제 프로덕션에서는 데이터베이스에서 조회해야 합니다.
 */
const USERS: Record<string, { password: string; user: User }> = {
  admin: {
    password: "admin123",
    user: {
      id: "user_admin",
      username: "admin",
      displayName: "관리자",
      role: "admin",
    },
  },
};

/**
 * 사용자 인증
 * @param username 사용자 이름
 * @param password 비밀번호
 * @returns 세션 ID 또는 null
 */
export function authenticate(
  username: string,
  password: string
): string | null {
  const userRecord = USERS[username];

  if (!userRecord || userRecord.password !== password) {
    console.log(`[Auth] 인증 실패: ${username}`);
    return null;
  }

  const session = createSession(userRecord.user);
  console.log(`[Auth] 인증 성공: ${username}`);

  return session.id;
}

/**
 * 세션 검증
 * @param sessionId 세션 ID
 * @returns 사용자 정보 또는 null
 */
export function validateSession(
  sessionId: string | undefined | null
): User | null {
  if (!sessionId) {
    return null;
  }

  const session = getSession(sessionId);

  if (!session) {
    return null;
  }

  return session.user;
}

/**
 * 로그아웃
 * @param sessionId 세션 ID
 */
export function logout(sessionId: string): void {
  deleteSession(sessionId);
  console.log(`[Auth] 로그아웃: ${sessionId}`);
}
