/**
 * @file src/app/layout.tsx
 * @description
 * Next.js 앱의 루트 레이아웃 컴포넌트
 * 모든 페이지에 공통으로 적용되는 레이아웃과 메타데이터를 정의합니다.
 *
 * 주요 변경사항:
 * - 네비게이션 바 추가 (모니터링 페이지 제외)
 * - 페이지 컨텐츠에 상단 패딩 추가 (네비게이션 바 높이만큼)
 */

"use client";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  // 모니터링 페이지와 로그인 페이지에서는 네비게이션 바 숨김
  const hideNavbar = pathname === "/monitor" || pathname === "/login";

  return (
    <html lang="ko" className="dark" suppressHydrationWarning>
      <head>
        <title>Smart Factory Monitor - 불량 모니터링 시스템</title>
        <meta
          name="description"
          content="실시간 제조 라인 불량 감지 및 자동 정지 시스템"
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {!hideNavbar && <Navbar />}
        <div className={hideNavbar ? "" : "pt-16"}>{children}</div>
      </body>
    </html>
  );
}
