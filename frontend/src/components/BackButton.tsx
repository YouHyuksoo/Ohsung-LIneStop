/**
 * @file src/components/BackButton.tsx
 * @description
 * 뒤로가기 버튼 컴포넌트
 *
 * 주요 기능:
 * 1. 이전 페이지로 이동하는 버튼
 * 2. 홈으로 이동하는 옵션
 * 3. 커스텀 라벨 지원
 *
 * 사용법:
 * <BackButton /> - 기본 뒤로가기
 * <BackButton label="목록으로" /> - 커스텀 라벨
 * <BackButton toHome /> - 홈으로 이동
 *
 * 초보자 가이드:
 * - useRouter: Next.js의 라우터 훅
 * - router.back(): 브라우저 히스토리 뒤로가기
 * - router.push('/'): 홈으로 이동
 */

"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";

interface BackButtonProps {
  /**
   * 버튼 라벨 (기본: "뒤로가기")
   */
  label?: string;
  /**
   * true면 홈으로 이동, false면 이전 페이지로 이동 (기본: false)
   */
  toHome?: boolean;
  /**
   * 커스텀 클래스명
   */
  className?: string;
}

/**
 * 뒤로가기 버튼 컴포넌트
 */
export default function BackButton({
  label = "뒤로가기",
  toHome = false,
  className = "",
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (toHome) {
      router.push("/");
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary ${className}`}
    >
      {toHome ? (
        <Home className="w-4 h-4" />
      ) : (
        <ArrowLeft className="w-4 h-4" />
      )}
      {label}
    </button>
  );
}
