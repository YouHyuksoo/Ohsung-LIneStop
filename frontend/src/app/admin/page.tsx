/**
 * @file src/app/admin/page.tsx
 * @description
 * 관리자 페이지 컴포넌트
 *
 * 주요 기능:
 * 1. 모니터링 서비스 제어 (시작/정지)
 * 2. 불량 규칙 관리 (조회/추가/삭제)
 * 3. 규칙 테이블 표시
 * 4. 규칙 추가 모달
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
 *
 * 사용법:
 * 1. "Add Rule" 버튼으로 새 규칙 추가
 * 2. 테이블에서 규칙 확인 및 삭제
 * 3. Start/Stop 버튼으로 서비스 제어
 */

"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Play, Square, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import BackButton from "@/components/BackButton";

interface DefectRule {
  code: string;
  name: string;
  threshold: number;
  is_active: boolean;
}

export default function AdminPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [rules, setRules] = useState<DefectRule[]>([]);
  const [newRule, setNewRule] = useState({ code: "", name: "", threshold: 5 });
  const [isModalOpen, setIsModalOpen] = useState(false);
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
   * 컴포넌트 마운트 시 상태 및 규칙 조회
   */
  useEffect(() => {
    fetchStatus();
    fetchRules();
  }, []);

  /**
   * 서비스 실행 상태 조회
   */
  const fetchStatus = async () => {
    try {
      const res = await axios.get("/api/status");
      setIsRunning(res.data.is_running);
    } catch (e) {
      console.error(e);
    }
  };

  /**
   * 모든 규칙 조회
   */
  const fetchRules = async () => {
    try {
      const res = await axios.get("/api/admin/rules");
      setRules(res.data);
    } catch (e) {
      console.error(e);
    }
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
   */
  const toggleService = async (action: "start" | "stop") => {
    try {
      await axios.post("/api/admin/control", { action });
      fetchStatus();
    } catch (e) {
      showAlert("오류", "서비스 제어에 실패했습니다");
    }
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
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <BackButton toHome label="메인으로 돌아가기" />
      </div>
      <h1 className="text-3xl font-bold mb-8">시스템 관리</h1>

      {/* 서비스 제어 섹션 */}
      <section className="mb-12 bg-card border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">모니터링 서비스 제어</h2>
        <div className="flex items-center gap-6">
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
              disabled={isRunning}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" /> 시작
            </button>
            <button
              onClick={() => toggleService("stop")}
              disabled={!isRunning}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Square className="w-4 h-4 fill-current" /> 정지
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDeleteRule(rule.code)}
                      className="p-2 hover:bg-red-500/20 text-red-500 rounded transition-colors"
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
