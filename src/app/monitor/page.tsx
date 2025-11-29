/**
 * @file src/app/monitor/page.tsx
 * @description
 * 실시간 모니터링 페이지.
 * 여러 하위 컴포넌트를 조합하여 모니터링 대시보드를 구성합니다.
 *
 * 주요 기능:
 * 1. 1초마다 API를 폴링하여 실시간 상태를 가져옴
 * 2. SystemStatusPanel: 시스템의 전반적인 상태 표시
 * 3. LineStatusAlert: 라인 정지/운영 상태를 시각적으로 알림
 * 4. RuleMonitorCard: 각 규칙별 불량 현황을 카드로 표시
 *
 * 동작 방식:
 * - 페이지 진입 시 규칙 목록을 한 번 가져옴
 * - 주기적으로 상태 API(/api/status)를 호출하여 동적 데이터를 업데이트
 * - 가져온 데이터를 각 하위 컴포넌트에 props로 전달하여 렌더링
 */

"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Eye } from "lucide-react";
import BackButton from "@/components/BackButton";
import SystemStatusPanel from "@/components/monitor/SystemStatusPanel";
import LineStatusAlert from "@/components/monitor/LineStatusAlert";
import RuleMonitorCard from "@/components/monitor/RuleMonitorCard";

// 타입 정의
interface Defect {
  id: string;
  code: string;
  name: string;
  type: "APPEARANCE" | "FUNCTION" | "PL" | "COMMON_SENSE";
  timestamp: string;
  resolved?: boolean;
}

interface Rule {
  code: string;
  name: string;
  type: "APPEARANCE" | "FUNCTION" | "PL" | "COMMON_SENSE";
  threshold: number;
  is_active: boolean;
  created_at?: string;
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
  total_counts: Record<string, number>;
  violated_types: ("APPEARANCE" | "FUNCTION" | "PL" | "COMMON_SENSE")[];
  polling_interval: number;
  rules?: Rule[];
  system_status?: {
    db_polling: boolean;
    db_mode: "Mock" | "Real";
    plc_connected: boolean;
    plc_mode: "Mock" | "Real";
    last_plc_command: string | null;
    last_plc_command_type: "STOP" | "RESET" | null;
  };
}

export default function MonitorPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [rules, setRules] = useState<Rule[]>([]); // ⭐ rules를 별도 state로 분리
  const [loading, setLoading] = useState(true);

  /**
   * 규칙 목록 조회 (최초 1회만)
   */
  const fetchRules = async () => {
    try {
      const res = await axios.get("/api/admin/rules");
      setRules(res.data);
    } catch (error) {
      console.error("Failed to fetch rules", error);
    }
  };

  /**
   * 백엔드에서 현재 상태를 조회합니다.
   * rules는 제외하고 동적 데이터만 조회
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
   * 컴포넌트 마운트 시 규칙과 상태를 조회
   * 규칙은 최초 1회만, 상태는 폴링으로 계속 조회
   */
  useEffect(() => {
    fetchRules(); // ⭐ 규칙은 최초 1회만
    fetchStatus();
  }, []);

  useEffect(() => {
    // 서버에서 받은 폴링 주기가 있으면 그 값을 사용, 없으면 기본 5초
    const intervalTime = status?.polling_interval
      ? status.polling_interval * 1000
      : 5000;
    const interval = setInterval(fetchStatus, intervalTime);
    return () => clearInterval(interval);
  }, [status?.polling_interval]);

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

  return (
    <div className="min-h-screen p-8 bg-background">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl border border-emerald-500/30">
            <Eye className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold">실시간 불량 모니터링</h1>
        </div>
        <BackButton toHome label="메인으로 돌아가기" />
      </header>

      <SystemStatusPanel
        systemStatus={status.system_status}
        pollingInterval={status.polling_interval}
      />

      <LineStatusAlert
        lineStatus={status.line_status}
        stopReason={status.stop_reason}
        violatedTypes={
          status.violated_types as (
            | "APPEARANCE"
            | "FUNCTION"
            | "PL"
            | "COMMON_SENSE"
          )[]
        }
      />

      {/* 규칙별 모니터링 영역 (규칙 기반 표시) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {rules && rules.length > 0 ? (
          rules.map((rule) => {
            const count = status?.current_counts?.[rule.code] || 0;
            const recentDefect = status.current_defects
              ?.filter((defect) => defect.code === rule.code)
              .slice(0, 1)[0];

            return (
              <RuleMonitorCard
                key={rule.code}
                rule={rule}
                count={count}
                recentDefect={recentDefect}
              />
            );
          })
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            등록된 규칙이 없습니다. Admin 페이지에서 규칙을 추가해주세요.
          </div>
        )}
      </div>
    </div>
  );
}
