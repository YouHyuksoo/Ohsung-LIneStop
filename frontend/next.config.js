/**
 * @file next.config.js
 * @description
 * Next.js 설정 파일입니다.
 * 개발 서버 CORS 설정, 리액트 Strict Mode 등을 관리합니다.
 *
 * 주요 설정:
 * - reactStrictMode: 개발 중 잠재적 문제 감지
 * - allowedDevOrigins: 개발 서버에 접근 가능한 IP 주소 화이트리스트
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 개발 서버에 접근 가능한 IP 주소 설정
  allowedDevOrigins: ['192.168.137.1', 'localhost', '127.0.0.1'],
};

module.exports = nextConfig;
