/**
 * @file src/app/page.tsx
 * @description
 * 메인 랜딩 페이지 컴포넌트
 *
 * 주요 섹션:
 * 1. 시스템 소개 및 타이틀
 * 2. 아키텍처 설명 (시스템 구조 및 동작 원리)
 * 3. 주요 메뉴 (Monitoring, History, Admin, Settings, Logs, Help)
 * 4. 시스템 상태 요약
 *
 * 디자인:
 * - 그라디언트 배경
 * - 호버 효과가 있는 카드 형태의 링크
 * - lucide-react 아이콘 사용
 */

import Link from "next/link";
import {
  Activity,
  Database,
  Settings,
  FileText,
  HelpCircle,
  Cpu,
  GitBranch,
  Zap,
  Shield,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-2 mb-4 border border-blue-500/30 bg-blue-500/10 rounded-full text-sm">
            JisungSolution v1.0 - 불량 모니터링 시스템
          </div>

          {/* 타이틀 */}
          <h1 className="text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            스마트 팩토리 모니터
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            실시간 불량 감지 및 자동 라인 정지 시스템
          </p>
        </div>

        {/* 주요 메뉴 그리드 */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">시스템 메뉴</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Monitoring 메뉴 */}
            <Link
              href="/monitor"
              className="group bg-card border rounded-xl p-6 shadow-sm transition-all hover:shadow-lg hover:border-emerald-500/50"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <Activity className="w-6 h-6 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-semibold">모니터링</h2>
                <span className="ml-auto text-emerald-400 group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                실시간 불량 윈도우 모니터링 및 라인 상태 확인
              </p>
            </Link>

            {/* History 메뉴 */}
            <Link
              href="/defects"
              className="group bg-card border rounded-xl p-6 shadow-sm transition-all hover:shadow-lg hover:border-blue-500/50"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Database className="w-6 h-6 text-blue-400" />
                </div>
                <h2 className="text-2xl font-semibold">불량 이력</h2>
                <span className="ml-auto text-blue-400 group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                과거 불량 이력 조회 및 데이터 분석
              </p>
            </Link>

            {/* Admin 메뉴 */}
            <Link
              href="/admin"
              className="group bg-card border rounded-xl p-6 shadow-sm transition-all hover:shadow-lg hover:border-orange-500/50"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <Settings className="w-6 h-6 text-orange-400" />
                </div>
                <h2 className="text-2xl font-semibold">관리자</h2>
                <span className="ml-auto text-orange-400 group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                서비스 제어 및 불량 규칙 관리
              </p>
            </Link>

            {/* Settings 메뉴 */}
            <Link
              href="/settings"
              className="group bg-card border rounded-xl p-6 shadow-sm transition-all hover:shadow-lg hover:border-purple-500/50"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Settings className="w-6 h-6 text-purple-400" />
                </div>
                <h2 className="text-2xl font-semibold">설정</h2>
                <span className="ml-auto text-purple-400 group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                PLC 주소, DB 연결 정보 등 시스템 설정
              </p>
            </Link>

            {/* Logs 메뉴 */}
            <Link
              href="/logs"
              className="group bg-card border rounded-xl p-6 shadow-sm transition-all hover:shadow-lg hover:border-yellow-500/50"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <FileText className="w-6 h-6 text-yellow-400" />
                </div>
                <h2 className="text-2xl font-semibold">로그</h2>
                <span className="ml-auto text-yellow-400 group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                시스템 로그 실시간 모니터링 및 이력 조회
              </p>
            </Link>

            {/* Help 메뉴 */}
            <Link
              href="/help"
              className="group bg-card border rounded-xl p-6 shadow-sm transition-all hover:shadow-lg hover:border-pink-500/50"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-pink-500/10 rounded-lg">
                  <HelpCircle className="w-6 h-6 text-pink-400" />
                </div>
                <h2 className="text-2xl font-semibold">도움말</h2>
                <span className="ml-auto text-pink-400 group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                사용자 가이드 및 시스템 도움말
              </p>
            </Link>
          </div>
        </section>

        {/* 아키텍처 설명 섹션 */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
            <Cpu className="w-8 h-8 text-blue-400" />
            시스템 아키텍처
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* 데이터 흐름 */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <GitBranch className="w-6 h-6 text-emerald-400" />
                <h3 className="text-xl font-semibold">데이터 흐름</h3>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">DB 폴링</p>
                    <p>5초마다 Oracle DB에서 새로운 불량 데이터 조회</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">규칙 검증</p>
                    <p>불량 코드와 매칭되는 활성 규칙 확인</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">윈도우 집계</p>
                    <p>1시간 윈도우 내에서 불량 코드별 카운트 누적</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold mt-0.5">
                    4
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">PLC 제어</p>
                    <p>임계값 초과 시 PLC로 라인 정지 신호 전송</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 핵심 기능 */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-6 h-6 text-yellow-400" />
                <h3 className="text-xl font-semibold">핵심 기능</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-emerald-400 mt-0.5" />
                  <div>
                    <p className="font-semibold">윈도우 기반 집계</p>
                    <p className="text-muted-foreground">
                      첫 불량 발생 시 1시간 윈도우 자동 시작 및 카운트 누적
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="font-semibold">자동 라인 정지</p>
                    <p className="text-muted-foreground">
                      임계값 도달 시 PLC 메모리 주소에 정지 신호 쓰기
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-semibold">규칙 기반 모니터링</p>
                    <p className="text-muted-foreground">
                      불량 코드별 임계값 설정 및 활성/비활성 제어
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-orange-400 mt-0.5" />
                  <div>
                    <p className="font-semibold">재발 방지</p>
                    <p className="text-muted-foreground">
                      라인 재가동 후에도 윈도우 유지 (시간 만료 시에만 리셋)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 기술 스택 */}
          <div className="bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-blue-500/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-3">기술 스택</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-semibold text-blue-400">프레임워크</p>
                <p className="text-muted-foreground">Next.js 15</p>
              </div>
              <div>
                <p className="font-semibold text-emerald-400">언어</p>
                <p className="text-muted-foreground">TypeScript</p>
              </div>
              <div>
                <p className="font-semibold text-orange-400">데이터베이스</p>
                <p className="text-muted-foreground">Oracle DB</p>
              </div>
              <div>
                <p className="font-semibold text-red-400">PLC</p>
                <p className="text-muted-foreground">Mitsubishi</p>
              </div>
            </div>
          </div>
        </section>

        {/* 푸터 */}
        <footer className="text-center text-sm text-muted-foreground">
          <p>JisungSolution © 2025 - 스마트 팩토리 모니터링 시스템</p>
        </footer>
      </div>
    </main>
  );
}
