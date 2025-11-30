/**
 * @file src/components/UserMenu.tsx
 * @description
 * 사용자 메뉴 드롭다운 컴포넌트
 *
 * 기능:
 * - 사용자 정보 표시
 * - 로그아웃 버튼
 */

"use client";

import { useEffect, useState } from "react";
import { User, LogOut, ChevronDown } from "lucide-react";
import { User as UserType } from "@/lib/types";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const router = useRouter();

  // 사용자 정보 조회
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get("/api/auth/me");
        setUser(response.data.user);
      } catch (error) {
        setUser(null);
      }
    };

    fetchUser();
  }, []);

  // 로그아웃
  const handleLogout = async () => {
    try {
      await axios.post("/api/auth/logout");
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  // 로그인하지 않은 경우
  if (!user) {
    return (
      <button
        onClick={() => router.push("/login")}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        <User className="w-4 h-4" />
        <span>로그인</span>
      </button>
    );
  }

  return (
    <div className="relative">
      {/* 사용자 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
          {user.displayName.charAt(0)}
        </div>
        <span className="font-medium hidden md:block">{user.displayName}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {/* 드롭다운 */}
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 메뉴 */}
          <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
            {/* 사용자 정보 */}
            <div className="p-4 border-b border-border">
              <p className="font-semibold">{user.displayName}</p>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {user.role === "admin" ? "관리자" : "사용자"}
              </p>
            </div>

            {/* 로그아웃 */}
            <button
              onClick={handleLogout}
              className="w-full p-3 flex items-center gap-2 hover:bg-secondary transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>로그아웃</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
