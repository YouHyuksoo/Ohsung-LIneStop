/**
 * @file src/components/Navbar.tsx
 * @description
 * 상단 네비게이션 바 컴포넌트
 *
 * 기능:
 * - 로고 및 프로젝트 이름
 * - 알림 아이콘 (배지 포함)
 * - 테마 전환 버튼
 * - 사용자 프로필 드롭다운
 * - 모니터링 페이지 바로가기 버튼
 * - 로그인/로그아웃 버튼
 */

"use client";

import Link from "next/link";
import { Activity } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import NotificationDropdown from "./NotificationDropdown";
import UserMenu from "./UserMenu";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 로고 및 프로젝트 이름 */}
          <Link
            href="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                라인 인터락 제어
              </h1>
              <p className="text-xs text-muted-foreground">
                불량 모니터링 시스템
              </p>
            </div>
          </Link>

          {/* 오른쪽 메뉴 */}
          <div className="flex items-center gap-3">
            {/* 모니터링 바로가기 */}
            <Link
              href="/monitor"
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-lg transition-colors font-medium"
            >
              <Activity className="w-4 h-4" />
              <span>모니터링</span>
            </Link>

            {/* 알림 */}
            <NotificationDropdown />

            {/* 테마 전환 */}
            <ThemeToggle />

            {/* 사용자 메뉴 */}
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
