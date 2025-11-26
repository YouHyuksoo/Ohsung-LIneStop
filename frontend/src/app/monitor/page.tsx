/**
 * @file src/app/monitor/page.tsx
 * @description
 * 실시간 모니터링 페이지 컴포넌트
 *
 * 주요 기능:
 * 1. 실시간 라인 상태 표시 (1초마다 폴링)
 * 2. 윈도우 정보 표시 (시작/종료 시간, 진행 상태)
 * 3. 불량 타임라인 (현재 윈도우의 모든 불량 표시)
 * 4. 불량 카운트 (코드별 집계 + 진행률 바)
 * 5. 라인 정지 알림 (전체 화면 오버레이)
 * 6. 조치 확인 버튼 (라인 재가동)
 *
 * 디자인:
 * - 라인 정지 시 빨간색 배경으로 전환
 * - 전체 화면 경고 오버레이 (애니메이션)
 * - 실시간 데이터 업데이트
 *
 * 사용법:
 * - 페이지 접속 시 자동으로 1초마다 상태 조회
 * - 라인 정지 시 "조치 확인 및 재가동" 버튼 클릭하여 재가동
 */

"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import BackButton from "@/components/BackButton";

// 타입 정의
interface Defect {
  id: string;
  code: string;
  name: string;
  timestamp: string;
}

interface StatusResponse {
  is_running: boolean;
  line_status: "RUNNING" | "STOPPED";
  stop_reason: string;
  window_info: {
    start: string | null;
    end: string | null;
    is_active: boolean;
  };
  current_counts: Record<string, number>;
  current_defects: Defect[];
}

export default function MonitorPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * 백엔드에서 현재 상태를 조회합니다.
   */
  const fetchStatus = async () => {
    try {
      const res = await axios.get("/api/status");
      setStatus(res.data);
    } catch (error) {
      console.error("Failed to fetch status", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 컴포넌트 마운트 시 1초마다 상태 조회
   */
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000); // 1초마다 폴링
    return () => clearInterval(interval);
  }, []);

  /**
   * 라인 정지 해제 처리
   */
  const handleResolve = async () => {
    if (!confirm("정말로 라인 정지를 해제하시겠습니까?")) return;
    try {
      await axios.post("/api/resolve", {
        reason: "수동 해제",
      });
      fetchStatus();
    } catch (error) {
      alert("해제 실패");
    }
  };

  // 로딩 상태
  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        로딩 중...
      </div>
    );

  // 연결 오류
  if (!status)
    return (
      <div className="flex h-screen items-center justify-center">연결 오류</div>
    );

  const isStopped = status.line_status === "STOPPED";

  return (
    <div
      className={cn(
        "min-h-screen p-8 transition-colors duration-500",
        isStopped ? "bg-red-950/30" : "bg-background"
      )}
    >
      {/* 뒤로가기 버튼 */}
      <div className="mb-6">
        <BackButton toHome label="메인으로 돌아가기" />
      </div>

      {/* 헤더 */}
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          {isStopped ? (
            <AlertTriangle className="text-red-500 w-10 h-10" />
          ) : (
            <ActivityIcon className="text-emerald-500 w-10 h-10" />
          )}
          라인 상태 모니터
        </h1>
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "px-4 py-2 rounded-full font-bold flex items-center gap-2",
              isStopped
                ? "bg-red-500 text-white"
                : "bg-emerald-500/20 text-emerald-500"
            )}
          >
            {isStopped ? "라인 정지됨" : "정상 가동 중"}
          </div>
        </div>
      </header>

      {/* 라인 정지 알림 오버레이 */}
      {isStopped && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-red-900/90 border-2 border-red-500 p-12 rounded-2xl max-w-2xl w-full text-center shadow-[0_0_100px_rgba(220,38,38,0.5)] animate-pulse">
            <AlertTriangle className="w-32 h-32 text-red-500 mx-auto mb-6" />
            <h2 className="text-6xl font-black text-white mb-4">라인 정지</h2>
            <p className="text-2xl text-red-200 mb-8">{status.stop_reason}</p>
            <button
              onClick={handleResolve}
              className="px-8 py-4 bg-white text-red-900 font-bold text-xl rounded-lg hover:bg-gray-200 transition-colors"
            >
              조치 확인 및 재가동
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 왼쪽: 윈도우 정보 */}
        <div className="lg:col-span-2 space-y-8">
          {/* 현재 윈도우 */}
          <div className="bg-card border-2 border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              현재 윈도우
            </h3>
            {status.window_info.is_active ? (
              <div className="space-y-4">
                <div className="flex justify-between text-lg">
                  <span className="text-muted-foreground">시작 시간:</span>
                  <span className="font-mono">
                    {format(new Date(status.window_info.start!), "HH:mm:ss")}
                  </span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-muted-foreground">종료 시간:</span>
                  <span className="font-mono">
                    {format(new Date(status.window_info.end!), "HH:mm:ss")}
                  </span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mt-4">
                  <div className="bg-blue-500 h-full animate-progress-indeterminate" />
                </div>
                <p className="text-center text-sm text-muted-foreground mt-2">
                  윈도우 활성 중. 불량이 누적되고 있습니다.
                </p>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                활성 윈도우 없음. 첫 불량을 기다리는 중입니다.
              </div>
            )}
          </div>

          {/* 불량 타임라인 */}
          <div className="bg-card border-2 border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-4">
              현재 윈도우 불량 이력
            </h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {status.current_defects.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  이 윈도우에 불량이 없습니다.
                </p>
              ) : (
                status.current_defects.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 border-2 border-border"
                  >
                    <span className="font-mono text-sm text-muted-foreground">
                      {format(new Date(d.timestamp), "HH:mm:ss")}
                    </span>
                    <span className="font-bold text-blue-400">{d.code}</span>
                    <span>{d.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 오른쪽: 불량 카운트 */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">불량 카운트</h3>
          {Object.entries(status.current_counts).map(([code, count]) => (
            <div
              key={code}
              className="bg-card border-2 border-border rounded-xl p-6 shadow-sm relative overflow-hidden"
            >
              <div className="flex justify-between items-end mb-2">
                <div>
                  <h4 className="text-2xl font-bold">{code}</h4>
                  <p className="text-sm text-muted-foreground">누적 횟수</p>
                </div>
                <span className="text-4xl font-black text-primary">
                  {count}
                </span>
              </div>
              {/* 진행률 바 (임계값 5로 가정) */}
              <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    count > 3 ? "bg-red-500" : "bg-blue-500"
                  )}
                  style={{ width: `${Math.min((count / 5) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
          {Object.keys(status.current_counts).length === 0 && (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
              아직 카운트가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Activity 아이콘 컴포넌트
 */
function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
