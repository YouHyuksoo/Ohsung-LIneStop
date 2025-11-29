/**
 * @file src/app/layout.tsx
 * @description
 * Next.js 앱의 루트 레이아웃 컴포넌트
 * 모든 페이지에 공통으로 적용되는 레이아웃과 메타데이터를 정의합니다.
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Smart Factory Monitor - 불량 모니터링 시스템",
  description: "실시간 제조 라인 불량 감지 및 자동 정지 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
