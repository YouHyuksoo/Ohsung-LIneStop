/**
 * @file src/app/admin/page.tsx
 * @description
 * 관리자 페이지 컴포넌트
 *
 * 주요 기능:
 * 1. 모니터링 서비스 제어 (시작/정지)
 * 2. DB와 PLC 운영 모드 표시 (⭐ NEW: Mock/Real 모드 표시)
 * 3. 불량 규칙 관리 (조회/추가/삭제)
 * 4. 규칙 테이블 표시
 * 5. 규칙 추가 모달
 *
 * 규칙 관리:
 * - 불량 코드, 이름, 임계값 설정
 * - 임계값 1 = 즉시 정지
 * - 임계값 N = 1시간 내 N회 발생 시 정지
 *
 * 서비스 제어:
 * - Start: 모니터링 서비스 시작
 * - Stop: 모니터링 서비스 정지
 * - 실시간 상태 표시 (초록/빨강 점)
 * - DB 폴링 모드: 🔧 Mock 또는 🔌 Real
 * - PLC 연결 모드: 🔧 Mock 또는 🔌 Real
 *
 * 사용법:
 * 1. "Add Rule" 버튼으로 새 규칙 추가
 * 2. 테이블에서 규칙 확인 및 삭제
 * 3. Start/Stop 버튼으로 서비스 제어
 * 4. 운영 모드 정보에서 현재 Mock/Real 모드 확인
 */

"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Play, Square, Plus, Trash2, Shield, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
// import ProtectedRoute from "@/components/ProtectedRoute"; // Login feature removed

interface DefectRule {
  code: string;
  name: string;
  threshold: number;
  is_active: boolean;
}

export default function AdminPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [plcStatus, setPlcStatus] = useState<"RUNNING" | "STOPPED">("RUNNING");
  const [plcStopReason, setPlcStopReason] = useState<string>("");
  const [dbMode, setDbMode] = useState<"Mock" | "Real">("Mock"); // ⭐ NEW: DB 폴링 모드
  const [plcMode, setPlcMode] = useState<"Mock" | "Real">("Mock"); // ⭐ NEW: PLC 연결 모드
  const [rules, setRules] = useState<DefectRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(true); // ⭐ 규칙 로딩 상태
  const [isTogglingService, setIsTogglingService] = useState(false); // ⭐ NEW: 서비스 토글 로딩 상태
  const [newRule, setNewRule] = useState({ code: "", name: "", threshold: 5 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editRule, setEditRule] = useState({
    code: "",
    name: "",
    threshold: 5,
  });
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error";
  }>({
    isOpen: false,
    message: "",
    type: "success",
  });
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: "alert" | "confirm";
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: "alert",
    title: "",
    message: "",
  });

  /**
   * 컴포넌트 마운트 시 상태 및 규칙 조회 (병렬 처리)
   */
  useEffect(() => {
    // ⭐ 병렬로 요청해서 초기 로드 시간 단축
    Promise.all([fetchStatus(), fetchRules()]);
  }, []);

  /**
   * 서비스 실행 상태 조회
   * ⭐ DB와 PLC 모드 정보도 함께 조회
   */
  const fetchStatus = async () => {
    try {
      const res = await axios.get("/api/status");
      // system_status.db_polling 값을 사용하여 실행 상태 판단
      // last_polling_time은 서비스가 정지되어도 값이 남아있을 수 있으므로 상태 판단용으로는 부적절함
      const isActuallyRunning = res.data.system_status?.db_polling ?? false;
      setIsRunning(isActuallyRunning);
      setPlcStatus(res.data.line_status || "RUNNING");
      setPlcStopReason(res.data.stop_reason || "");
      // ⭐ NEW: DB와 PLC 모드 정보 설정
      setDbMode(res.data.system_status?.db_mode || "Mock");
      setPlcMode(res.data.system_status?.plc_mode || "Mock");
    } catch (e) {
      console.error(e);
    }
  };

  /**
   * 모든 규칙 조회
   * ⭐ 로딩 상태 추적 (규칙 조회 완료 후 시작 버튼 활성화)
   */
  const fetchRules = async () => {
    try {
      setIsLoadingRules(true); // ⭐ 로딩 시작
      const res = await axios.get("/api/admin/rules");
      setRules(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingRules(false); // ⭐ 로딩 완료 (성공/실패 상관없이)
    }
  };

  /**
   * 토스트 메시지 표시 헬퍼 함수
   */
  const showToast = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToast({
      isOpen: true,
      message,
      type,
    });
    // 3초 후 자동으로 닫기
    setTimeout(() => {
      setToast((prev) => ({ ...prev, isOpen: false }));
    }, 3000);
  };

  /**
   * 다이얼로그 표시 헬퍼 함수
   */
  const showAlert = (title: string, message: string) => {
    setDialog({
      isOpen: true,
      type: "alert",
      title,
      message,
    });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void
  ) => {
    setDialog({
      isOpen: true,
      type: "confirm",
      title,
      message,
      onConfirm,
    });
  };

  const closeDialog = () => {
    setDialog({
      isOpen: false,
      type: "alert",
      title: "",
      message: "",
    });
  };

  /**
   * 서비스 시작/정지
   * ⭐ fetchStatus()를 await로 기다려서 UI 상태가 즉시 업데이트되도록 함
   * ⭐ NEW: 로딩 상태 추가로 중복 클릭 방지
   */
  const toggleService = async (action: "start" | "stop") => {
    // 로딩 중이거나 규칙 로딩 중이면 실행 안 함
    if (isTogglingService || isLoadingRules) {
      return;
    }

    setIsTogglingService(true);
    try {
      await axios.post("/api/admin/control", { action });
      // ⭐ fetchStatus()를 await로 기다리기 (즉시 상태 동기화)
      await fetchStatus();
      const message =
        action === "start"
          ? "모니터링 서비스가 시작되었습니다"
          : "모니터링 서비스가 정지되었습니다";
      showToast(message, "success");
    } catch (e) {
      showToast("서비스 제어에 실패했습니다", "error");
    } finally {
      setIsTogglingService(false);
    }
  };

  /**
   * PLC 강제 제어
   */
  const togglePlc = (action: "force_stop" | "force_reset") => {
    const actionName = action === "force_stop" ? "강제 정지" : "강제 해제";

    showConfirm(
      "PLC 제어 확인",
      `정말로 PLC를 ${actionName} 하시겠습니까?`,
      async () => {
        closeDialog(); // ⭐ 다이얼로그 먼저 닫기 (UX 개선)
        try {
          await axios.post("/api/admin/control", { action });
          await fetchStatus();
          showToast(`PLC ${actionName} 명령을 전송했습니다`, "success");
        } catch (e) {
          showToast(`PLC ${actionName} 실패`, "error");
        }
      }
    );
  };

  /**
   * 새 규칙 추가
   */
  const handleAddRule = async () => {
    // 입력값 검증
    if (!newRule.code.trim()) {
      showAlert("입력 오류", "불량 코드를 입력해주세요");
      return;
    }
    if (!newRule.name.trim()) {
      showAlert("입력 오류", "불량명을 입력해주세요");
      return;
    }
    if (newRule.threshold < 1) {
      showAlert("입력 오류", "임계값은 1 이상이어야 합니다");
      return;
    }

    try {
      console.log("[Admin] 규칙 추가 시도:", newRule);
      const response = await axios.post("/api/admin/rules", {
        ...newRule,
        is_active: true,
        created_at: "",
      });
      console.log("[Admin] 규칙 추가 성공:", response.data);

      setIsModalOpen(false);
      setNewRule({ code: "", name: "", threshold: 5 });
      fetchRules();
      showAlert("성공", "규칙이 추가되었습니다");
    } catch (e: any) {
      console.error("[Admin] 규칙 추가 실패:", e);
      showAlert("오류", e.response?.data?.error || "규칙 추가에 실패했습니다");
    }
  };

  /**
   * 규칙 수정 모달 열기
   */
  const handleEditRule = (rule: DefectRule) => {
    setEditRule({
      code: rule.code,
      name: rule.name,
      threshold: rule.threshold,
    });
    setEditingCode(rule.code);
    setIsEditModalOpen(true);
  };

  /**
   * 규칙 수정 저장
   */
  const handleSaveEdit = async () => {
    // 입력값 검증
    if (!editRule.name.trim()) {
      showAlert("입력 오류", "불량명을 입력해주세요");
      return;
    }
    if (editRule.threshold < 1) {
      showAlert("입력 오류", "임계값은 1 이상이어야 합니다");
      return;
    }

    try {
      console.log("[Admin] 규칙 수정 시도:", editRule);
      await axios.put(`/api/admin/rules/${editingCode}`, {
        name: editRule.name,
        threshold: editRule.threshold,
      });
      console.log("[Admin] 규칙 수정 성공");

      setIsEditModalOpen(false);
      setEditingCode(null);
      fetchRules();
      showAlert("성공", "규칙이 수정되었습니다");
    } catch (e: any) {
      console.error("[Admin] 규칙 수정 실패:", e);
      showAlert("오류", e.response?.data?.error || "규칙 수정에 실패했습니다");
    }
  };

  /**
   * 규칙 삭제
   */
  const handleDeleteRule = (code: string) => {
    showConfirm(
      "규칙 삭제",
      `규칙 ${code}을(를) 삭제하시겠습니까?`,
      async () => {
        try {
          await axios.delete(`/api/admin/rules/${code}`);
          fetchRules();
          closeDialog();
        } catch (e) {
          closeDialog();
          showAlert("오류", "규칙 삭제에 실패했습니다");
        }
      }
    );
  };

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto">
      {/* 토스트 메시지 */}
      {toast.isOpen && (
        <div
          className="fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2 duration-300"
          style={{
            backgroundColor: toast.type === "success" ? "#10b981" : "#ef4444",
            color: "white",
          }}
        >
          <div>{toast.type === "success" ? "✓" : "✕"}</div>
          <span className="font-semibold">{toast.message}</span>
        </div>
      )}

      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-500/30">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">시스템 관리</h1>
          </div>
        </div>
      </header>

      {/* 서비스 제어 섹션 */}
      <section className="mb-12 bg-card border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-6">모니터링 서비스 제어</h2>

        {/* 서비스 상태 행 */}
        <div className="flex items-center gap-6 mb-6 pb-6 border-b border-border/50">
          {/* 상태 표시 */}
          <div
            className={cn(
              "w-4 h-4 rounded-full animate-pulse",
              isRunning ? "bg-green-500" : "bg-red-500"
            )}
          />
          <span className="text-lg font-medium">
            {isRunning ? "서비스 실행 중" : "서비스 정지됨"}
          </span>

          {/* 제어 버튼 */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => toggleService("start")}
              disabled={isRunning || isLoadingRules || isTogglingService} // ⭐ NEW: 로딩 중이면 비활성화
              className="flex items-center gap-2 px-6 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTogglingService ? (
                <>
                  <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                  처리 중...
                </>
              ) : isLoadingRules ? (
                <>
                  <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                  로딩 중...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> 시작
                </>
              )}
            </button>
            <button
              onClick={() => toggleService("stop")}
              disabled={!isRunning || isTogglingService} // ⭐ NEW: 로딩 중이면 비활성화
              className="flex items-center gap-2 px-6 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTogglingService ? (
                <>
                  <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 fill-current" /> 정지
                </>
              )}
            </button>
          </div>
        </div>

        {/* ⭐ NEW: 운영 모드 정보 행 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">DB 폴링 모드:</span>
            <span
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold",
                dbMode === "Mock"
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-purple-500/20 text-purple-400"
              )}
            >
              {dbMode === "Mock" ? "🔧 Mock" : "🔌 Real"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              PLC 연결 모드:
            </span>
            <span
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold",
                plcMode === "Mock"
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-purple-500/20 text-purple-400"
              )}
            >
              {plcMode === "Mock" ? "🔧 Mock" : "🔌 Real"}
            </span>
          </div>
        </div>
      </section>

      {/* PLC 제어 섹션 */}
      <section className="mb-12 bg-card border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">PLC 제어</h2>
        <div className="flex items-center gap-6">
          {/* PLC 상태 표시 */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-4 h-4 rounded-full",
                plcStatus === "RUNNING"
                  ? "bg-green-500"
                  : "bg-red-500 animate-pulse"
              )}
            />
            <span className="text-lg font-medium">
              {plcStatus === "RUNNING" ? "라인 가동 중" : "라인 정지됨"}
            </span>
            {plcStopReason && (
              <span className="text-sm text-muted-foreground bg-secondary px-2 py-1 rounded">
                사유: {plcStopReason}
              </span>
            )}
          </div>

          {/* PLC 제어 버튼 */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => togglePlc("force_reset")}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4" /> 강제 해제
            </button>
            <button
              onClick={() => togglePlc("force_stop")}
              className="flex items-center gap-2 px-6 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Square className="w-4 h-4 fill-current" /> 강제 정지
            </button>
          </div>
        </div>
      </section>

      {/* 규칙 관리 섹션 */}
      <section className="bg-card border rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">불량 모니터링 규칙</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" /> 규칙 추가
          </button>
        </div>

        {/* 규칙 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground">
                <th className="p-4">코드</th>
                <th className="p-4">불량명</th>
                <th className="p-4">임계값 (정지 기준)</th>
                <th className="p-4">상태</th>
                <th className="p-4 text-right">작업</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr
                  key={rule.code}
                  className="border-b border-border/50 hover:bg-secondary/50"
                >
                  <td className="p-4 font-mono font-bold">{rule.code}</td>
                  <td className="p-4">{rule.name}</td>
                  <td className="p-4">
                    <span
                      className={cn(
                        "px-2 py-1 rounded text-xs font-bold",
                        rule.threshold === 1
                          ? "bg-red-500/20 text-red-500"
                          : "bg-blue-500/20 text-blue-500"
                      )}
                    >
                      {rule.threshold === 1
                        ? "즉시 정지"
                        : `${rule.threshold}회 / 시간`}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500" /> 활성
                    </span>
                  </td>
                  <td className="p-4 text-right flex gap-2 justify-end">
                    <button
                      onClick={() => handleEditRule(rule)}
                      className="p-2 hover:bg-blue-500/20 text-blue-500 rounded transition-colors"
                      title="규칙 수정"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.code)}
                      className="p-2 hover:bg-red-500/20 text-red-500 rounded transition-colors"
                      title="규칙 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-muted-foreground"
                  >
                    규칙이 정의되지 않았습니다. 모니터링을 시작하려면 규칙을
                    추가하세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 규칙 추가 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border p-8 rounded-xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-6">모니터링 규칙 추가</h3>
            <div className="space-y-4">
              {/* 불량 코드 입력 */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  불량 코드
                </label>
                <input
                  type="text"
                  value={newRule.code}
                  onChange={(e) =>
                    setNewRule({ ...newRule, code: e.target.value })
                  }
                  className="w-full p-2 rounded border bg-background"
                  placeholder="예: NG001"
                />
              </div>
              {/* 불량 이름 입력 */}
              <div>
                <label className="block text-sm font-medium mb-1">불량명</label>
                <input
                  type="text"
                  value={newRule.name}
                  onChange={(e) =>
                    setNewRule({ ...newRule, name: e.target.value })
                  }
                  className="w-full p-2 rounded border bg-background"
                  placeholder="예: 표면 스크래치"
                />
              </div>
              {/* 임계값 입력 */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  임계값 (정지 기준)
                </label>
                <input
                  type="number"
                  value={newRule.threshold}
                  onChange={(e) =>
                    setNewRule({
                      ...newRule,
                      threshold: parseInt(e.target.value),
                    })
                  }
                  className="w-full p-2 rounded border bg-background"
                  min={1}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  즉시 정지하려면 1로 설정하세요.
                </p>
              </div>
            </div>
            {/* 모달 버튼 */}
            <div className="flex justify-end gap-2 mt-8">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 hover:bg-secondary rounded"
              >
                취소
              </button>
              <button
                onClick={handleAddRule}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                규칙 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 규칙 수정 모달 */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border p-8 rounded-xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-6">모니터링 규칙 수정</h3>
            <div className="space-y-4">
              {/* 불량 코드 (읽기 전용) */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  불량 코드
                </label>
                <input
                  type="text"
                  value={editRule.code}
                  disabled
                  className="w-full p-2 rounded border bg-secondary text-muted-foreground cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  코드는 변경할 수 없습니다.
                </p>
              </div>
              {/* 불량 이름 입력 */}
              <div>
                <label className="block text-sm font-medium mb-1">불량명</label>
                <input
                  type="text"
                  value={editRule.name}
                  onChange={(e) =>
                    setEditRule({ ...editRule, name: e.target.value })
                  }
                  className="w-full p-2 rounded border bg-background"
                  placeholder="예: 표면 스크래치"
                />
              </div>
              {/* 임계값 입력 */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  임계값 (정지 기준)
                </label>
                <input
                  type="number"
                  value={editRule.threshold}
                  onChange={(e) =>
                    setEditRule({
                      ...editRule,
                      threshold: parseInt(e.target.value),
                    })
                  }
                  className="w-full p-2 rounded border bg-background"
                  min={1}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  즉시 정지하려면 1로 설정하세요.
                </p>
              </div>
            </div>
            {/* 모달 버튼 */}
            <div className="flex justify-end gap-2 mt-8">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 hover:bg-secondary rounded"
              >
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                수정 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 다이얼로그 모달 */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border p-6 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold mb-4">{dialog.title}</h3>
            <p className="text-muted-foreground mb-6">{dialog.message}</p>
            <div className="flex justify-end gap-2">
              {dialog.type === "confirm" && (
                <button
                  onClick={closeDialog}
                  className="px-4 py-2 hover:bg-secondary rounded transition-colors"
                >
                  취소
                </button>
              )}
              <button
                onClick={() => {
                  if (dialog.type === "confirm" && dialog.onConfirm) {
                    dialog.onConfirm();
                  } else {
                    closeDialog();
                  }
                }}
                className={cn(
                  "px-4 py-2 rounded transition-colors",
                  dialog.type === "confirm"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                {dialog.type === "confirm" ? "확인" : "닫기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
