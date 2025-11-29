/**
 * @file src/lib/utils.ts
 * @description
 * 유틸리티 함수 모음
 *
 * cn 함수: Tailwind CSS 클래스를 조건부로 결합하는 함수
 * clsx와 tailwind-merge를 결합하여 클래스 충돌을 방지합니다.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
