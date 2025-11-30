/**
 * @file src/app/login/page.tsx
 * @description
 * 로그인 페이지
 *
 * 기능:
 * - 로그인 폼 표시
 * - 로그인 후 원래 페이지로 리다이렉트
 */

import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";
import { Shield } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-secondary/20">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">로그인</h1>
          <p className="text-muted-foreground">라인 인터락 제어 시스템</p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
          <Suspense fallback={<div className="text-center">로딩 중...</div>}>
            <LoginForm />
          </Suspense>
        </div>

        {/* 푸터 */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          JisungSolution © 2025
        </p>
      </div>
    </div>
  );
}
