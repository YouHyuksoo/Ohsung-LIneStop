/**
 * @file src/components/LoginForm.tsx
 * @description
 * 로그인 폼 컴포넌트
 *
 * 기능:
 * - 아이디/비밀번호 입력
 * - 로그인 처리
 * - 에러 메시지 표시
 */

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { LogIn } from "lucide-react";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await axios.post("/api/auth/login", { username, password });

      // 로그인 성공 - 원래 페이지로 리다이렉트
      const from = searchParams.get("from") || "/";
      router.push(from);
      router.refresh();
    } catch (err: any) {
      setError(err.response?.data?.error || "로그인에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 에러 메시지 */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* 아이디 입력 */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium mb-2">
          아이디
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="admin"
          required
          autoFocus
        />
      </div>

      {/* 비밀번호 입력 */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-2">
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="••••••••"
          required
        />
      </div>

      {/* 로그인 버튼 */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        <LogIn className="w-5 h-5" />
        {loading ? "로그인 중..." : "로그인"}
      </button>

      {/* 안내 메시지 */}
      <div className="text-center text-sm text-muted-foreground">
        <p>기본 계정: admin / admin123</p>
      </div>
    </form>
  );
}
