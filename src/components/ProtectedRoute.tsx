/**
 * @file src/components/ProtectedRoute.tsx
 * @description
 * 보호된 라우트 래퍼 컴포넌트
 *
 * 기능:
 * - 인증 상태 확인
 * - 미인증 시 로그인 페이지로 리다이렉트
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import axios from "axios";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await axios.get("/api/auth/me");
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        router.push(`/login?from=${encodeURIComponent(pathname)}`);
      }
    };

    checkAuth();
  }, [router, pathname]);

  // 인증 확인 중
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  // 인증되지 않음 (리다이렉트 중)
  if (!isAuthenticated) {
    return null;
  }

  // 인증됨
  return <>{children}</>;
}
