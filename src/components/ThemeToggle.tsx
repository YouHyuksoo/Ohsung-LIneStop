/**
 * @file src/components/ThemeToggle.tsx
 * @description
 * 테마 전환 버튼 컴포넌트
 * 라이트/다크 모드를 전환합니다.
 *
 * 기능:
 * - 라이트/다크 모드 전환
 * - 로컬 스토리지에 테마 저장
 * - 아이콘 애니메이션
 */

"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  // 컴포넌트 마운트 시 테마 불러오기
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  // 테마 전환
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  // 마운트 전에는 아무것도 렌더링하지 않음 (hydration 오류 방지)
  if (!mounted) {
    return <button className="p-2 rounded-lg bg-secondary/50 w-10 h-10" />;
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
      title={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5 text-yellow-400" />
      ) : (
        <Moon className="w-5 h-5 text-blue-600" />
      )}
    </button>
  );
}
