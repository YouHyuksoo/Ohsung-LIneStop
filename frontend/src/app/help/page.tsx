/**
 * @file src/app/help/page.tsx
 * @description
 * 도움말 및 사용자 가이드 페이지
 *
 * 주요 섹션:
 * 1. 시스템 개요
 * 2. 빠른 시작 가이드
 * 3. 주요 기능 사용법
 * 4. 문제 해결 (Troubleshooting)
 * 5. FAQ
 */

"use client";

import Link from "next/link";
import {
  Home,
  Book,
  Zap,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

export default function HelpPage() {
  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <Home className="w-4 h-4" />
            메인으로 돌아가기
          </Link>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <HelpCircle className="w-10 h-10 text-pink-400" />
            사용자 가이드
          </h1>
          <p className="text-muted-foreground">
            JisungSolution 시스템 사용법 및 도움말
          </p>
        </div>

        {/* 시스템 개요 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Book className="w-6 h-6 text-blue-400" />
            시스템 개요
          </h2>
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <p className="text-foreground">
              <strong className="text-blue-400">JisungSolution</strong>는 스마트
              팩토리 환경에서 불량을 실시간으로 감지하고 자동으로 라인을
              정지시키는 시스템입니다.
            </p>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm">
                <strong>핵심 원리:</strong> DB를 5초마다 폴링하여 새로운 불량
                데이터를 확인하고, 설정된 규칙에 따라 1시간 윈도우 내에서 불량을
                집계합니다. 임계값 초과 시 PLC에 정지 신호를 전송하여 라인을
                자동으로 정지시킵니다.
              </p>
            </div>
          </div>
        </section>

        {/* 빠른 시작 가이드 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-emerald-400" />
            빠른 시작 가이드
          </h2>
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <ol className="space-y-6">
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">불량 규칙 설정</h3>
                  <p className="text-muted-foreground mb-2">
                    Admin 페이지에서 모니터링할 불량 코드와 임계값을 설정합니다.
                  </p>
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline"
                  >
                    Admin 페이지로 이동 <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </li>

              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">서비스 시작</h3>
                  <p className="text-muted-foreground mb-2">
                    Admin 페이지에서 "Start" 버튼을 클릭하여 모니터링 서비스를
                    시작합니다.
                  </p>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3 text-sm">
                    💡 서버가 시작될 때 자동으로 모니터링 서비스가 시작됩니다.
                  </div>
                </div>
              </li>

              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    실시간 모니터링
                  </h3>
                  <p className="text-muted-foreground mb-2">
                    Monitor 페이지에서 라인 상태와 불량 발생 현황을 실시간으로
                    확인합니다.
                  </p>
                  <Link
                    href="/monitor"
                    className="inline-flex items-center gap-1 text-sm text-orange-400 hover:underline"
                  >
                    Monitor 페이지로 이동 <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </li>

              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold shrink-0">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">라인 정지 해제</h3>
                  <p className="text-muted-foreground mb-2">
                    라인이 정지되면 Monitor 페이지에서 "조치 확인 및 재가동"
                    버튼을 클릭하여 라인을 재가동합니다.
                  </p>
                  <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-sm">
                    ⚠️ 주의: 라인 재가동 후에도 윈도우는 유지됩니다. 동일한
                    불량이 다시 발생하면 즉시 라인이 정지될 수 있습니다.
                  </div>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* 주요 기능 사용법 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-purple-400" />
            주요 기능 사용법
          </h2>

          <div className="space-y-6">
            {/* 불량 규칙 관리 */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-3">📋 불량 규칙 관리</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">규칙 추가:</strong> Admin
                  페이지에서 "Add Rule" 버튼 클릭 → 불량 코드, 이름, 임계값 입력
                  → 저장
                </p>
                <p>
                  <strong className="text-foreground">규칙 삭제:</strong> 규칙
                  목록에서 휴지통 아이콘 클릭
                </p>
                <p>
                  <strong className="text-foreground">임계값 의미:</strong>
                </p>
                <ul className="ml-6 list-disc space-y-1">
                  <li>
                    <code className="px-2 py-1 bg-muted rounded">
                      threshold = 1
                    </code>
                    : 불량 1회 발생 시 즉시 라인 정지
                  </li>
                  <li>
                    <code className="px-2 py-1 bg-muted rounded">
                      threshold = N
                    </code>
                    : 1시간 내 N회 발생 시 라인 정지
                  </li>
                </ul>
              </div>
            </div>

            {/* 윈도우 집계 */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-3">⏱️ 윈도우 집계</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">윈도우 시작:</strong> 첫
                  불량 발생 시 자동으로 1시간 윈도우가 시작됩니다.
                </p>
                <p>
                  <strong className="text-foreground">카운트 누적:</strong>{" "}
                  윈도우 내에서 발생한 불량은 코드별로 카운트됩니다.
                </p>
                <p>
                  <strong className="text-foreground">윈도우 리셋:</strong>{" "}
                  윈도우는 시작 후 1시간이 지나면 자동으로 리셋됩니다.
                </p>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3 mt-2">
                  💡 라인 재가동 시에는 윈도우가 리셋되지 않습니다. 이는 재발
                  방지를 위한 설계입니다.
                </div>
              </div>
            </div>

            {/* 설정 관리 */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-3">⚙️ 시스템 설정</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Settings 페이지에서 PLC 주소, DB 연결 정보 등 시스템 설정을
                  관리할 수 있습니다.
                </p>
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-1 text-purple-400 hover:underline"
                >
                  Settings 페이지로 이동 <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* 로그 확인 */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-3">📄 로그 확인</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Logs 페이지에서 시스템의 모든 로그를 실시간으로 확인할 수
                  있습니다.
                </p>
                <Link
                  href="/logs"
                  className="inline-flex items-center gap-1 text-yellow-400 hover:underline"
                >
                  Logs 페이지로 이동 <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 문제 해결 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-400" />
            문제 해결 (Troubleshooting)
          </h2>

          <div className="space-y-4">
            <details className="bg-card border rounded-xl p-6 shadow-sm">
              <summary className="font-semibold cursor-pointer hover:text-blue-400">
                ❓ 모니터링 서비스가 시작되지 않습니다
              </summary>
              <div className="mt-4 text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>해결 방법:</strong>
                </p>
                <ol className="ml-6 list-decimal space-y-1">
                  <li>Admin 페이지에서 서비스 상태를 확인하세요.</li>
                  <li>브라우저 콘솔(F12)에서 에러 메시지를 확인하세요.</li>
                  <li>서버를 재시작하고 다시 시도하세요.</li>
                </ol>
              </div>
            </details>

            <details className="bg-card border rounded-xl p-6 shadow-sm">
              <summary className="font-semibold cursor-pointer hover:text-blue-400">
                ❓ 불량이 발생해도 라인이 정지되지 않습니다
              </summary>
              <div className="mt-4 text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>확인 사항:</strong>
                </p>
                <ol className="ml-6 list-decimal space-y-1">
                  <li>
                    Admin 페이지에서 해당 불량 코드의 규칙이 활성화되어 있는지
                    확인하세요.
                  </li>
                  <li>임계값이 적절히 설정되어 있는지 확인하세요.</li>
                  <li>
                    Monitor 페이지에서 윈도우가 활성화되어 있는지 확인하세요.
                  </li>
                  <li>Settings 페이지에서 PLC 연결이 정상인지 확인하세요.</li>
                </ol>
              </div>
            </details>

            <details className="bg-card border rounded-xl p-6 shadow-sm">
              <summary className="font-semibold cursor-pointer hover:text-blue-400">
                ❓ 윈도우가 리셋되지 않습니다
              </summary>
              <div className="mt-4 text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>이해:</strong> 윈도우는 시작 후 1시간이 지나야
                  자동으로 리셋됩니다. Monitor 페이지에서 윈도우 종료 시간을
                  확인하세요.
                </p>
                <p className="text-yellow-400">
                  💡 라인 정지 해제 시에는 윈도우가 리셋되지 않습니다. 이는
                  의도된 동작입니다.
                </p>
              </div>
            </details>

            <details className="bg-card border rounded-xl p-6 shadow-sm">
              <summary className="font-semibold cursor-pointer hover:text-blue-400">
                ❓ DB 또는 PLC 연결 오류가 발생합니다
              </summary>
              <div className="mt-4 text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>해결 방법:</strong>
                </p>
                <ol className="ml-6 list-decimal space-y-1">
                  <li>Settings 페이지에서 연결 정보를 확인하세요.</li>
                  <li>Mock 모드가 활성화되어 있는지 확인하세요 (개발 환경).</li>
                  <li>실제 DB/PLC와의 네트워크 연결을 확인하세요.</li>
                  <li>Logs 페이지에서 상세한 에러 로그를 확인하세요.</li>
                </ol>
              </div>
            </details>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-pink-400" />
            자주 묻는 질문 (FAQ)
          </h2>

          <div className="space-y-4">
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-2">
                Q. Mock 모드와 실제 모드의 차이는 무엇인가요?
              </h3>
              <p className="text-sm text-muted-foreground">
                A. Mock 모드는 실제 PLC나 Oracle DB 없이도 시스템을 테스트할 수
                있는 시뮬레이션 모드입니다. 실제 모드로 전환하려면 Settings
                페이지에서 Mock 모드를 비활성화하고 실제 연결 정보를 입력하세요.
              </p>
            </div>

            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-2">
                Q. 여러 개의 불량 코드를 동시에 모니터링할 수 있나요?
              </h3>
              <p className="text-sm text-muted-foreground">
                A. 네, Admin 페이지에서 원하는 만큼 불량 규칙을 추가할 수
                있습니다. 각 규칙은 독립적으로 동작하며, 임계값도 개별적으로
                설정할 수 있습니다.
              </p>
            </div>

            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-2">
                Q. 시스템은 몇 초마다 불량을 체크하나요?
              </h3>
              <p className="text-sm text-muted-foreground">
                A. 시스템은 5초마다 DB를 폴링하여 새로운 불량 데이터를
                확인합니다. 프론트엔드 Monitor 페이지는 1초마다 상태를
                업데이트합니다.
              </p>
            </div>

            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-2">
                Q. 불량 이력은 얼마나 보관되나요?
              </h3>
              <p className="text-sm text-muted-foreground">
                A. 불량 이력은 Oracle DB에 영구적으로 저장됩니다. History
                페이지에서 과거 데이터를 조회할 수 있습니다.
              </p>
            </div>
          </div>
        </section>

        {/* 지원 정보 */}
        <section className="mb-8">
          <div className="bg-gradient-to-r from-blue-500/10 to-pink-500/10 border border-blue-500/20 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-3">
              추가 지원이 필요하신가요?
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              더 자세한 도움이 필요하시면 시스템 관리자에게 문의하거나 Logs
              페이지에서 상세한 로그를 확인하세요.
            </p>
            <div className="flex gap-4">
              <Link
                href="/logs"
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
              >
                로그 확인하기
              </Link>
              <Link
                href="/"
                className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm"
              >
                메인으로 돌아가기
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
