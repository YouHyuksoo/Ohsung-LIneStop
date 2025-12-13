/**
 * @file src/components/Navbar.tsx
 * @description
 * 상단 네비게이션 바 컴포넌트
 *
 * 기능:
 * - 로고 및 프로젝트 이름
 * - 모니터링 페이지 바로가기 버튼
 * - 설정 페이지 바로가기 버튼 (⭐ NEW: 설정 아이콘)
 * - 알림 아이콘 (배지 포함)
 * - 테마 전환 버튼
 * - 사용자 프로필 드롭다운
 * - 로그인/로그아웃 버튼
 */

"use client";

import Link from "next/link";
import { Activity, Settings, FileText, Shield, HelpCircle } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import NotificationDropdown from "./NotificationDropdown";
// import UserMenu from "./UserMenu"; // Removed login feature

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

          {/* 중앙 메뉴 (데스크탑) */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/monitor"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
            >
              <Activity className="w-4 h-4" />
              <span>모니터링</span>
            </Link>
            <Link
              href="/logs"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>로그</span>
            </Link>
            <Link
              href="/admin"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-500 hover:bg-purple-500/10 rounded-lg transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span>관리자</span>
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-500/10 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>설정</span>
            </Link>
            <Link
              href="/help"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              <span>도움말</span>
            </Link>
          </div>

          {/* 오른쪽 메뉴 */}
          <div className="flex items-center gap-3">
            {/* 알림 */}
            <NotificationDropdown />
            {/* 테마 전환 */}
            <ThemeToggle />
            {/* 사용자 메뉴 */}
            {/* Login feature removed by request */}
            {/* <UserMenu /> */}
          </div>
        </div>
      </div>
    </nav>
  );
}
