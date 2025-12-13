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
  allowedDevOrigins: ["192.168.137.1", "localhost", "127.0.0.1"],
  // 네이티브 모듈(oracledb)을 번들링에서 제외하여 Thick 모드 동작 지원
  serverExternalPackages: ["oracledb"],
  webpack: (config) => {
    config.externals.push("better-sqlite3");
    config.externals.push("oracledb"); // oracledb 추가
    return config;
  },
};

module.exports = nextConfig;
