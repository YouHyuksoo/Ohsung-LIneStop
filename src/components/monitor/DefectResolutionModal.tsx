/**
 * @file src/components/monitor/DefectResolutionModal.tsx
 * @description
 * 불양 해결 처리 모달 컴포넌트
 *
 * 주요 기능:
 * 1. 미해결 불양(NG_RELEASE_YN = 'N') 목록 조회 및 표시
 * 2. 불양 선택 및 조치 사유 입력
 * 3. 해결 처리 API 호출
 * 4. 실시간 상태 업데이트
 *
 * 동작 방식:
 * - 모달 오픈 시 GET /api/defects/resolve로 미해결 불양 조회
 * - 사용자가 불양을 선택하고 조치 사유를 입력
 * - 제출 시 POST /api/defects/resolve로 해결 처리
 * - 처리 후 목록 새로고침
 *
 * 초보자 가이드:
 * 1. **isOpen**: 모달 표시 여부
 * 2. **unresolvedDefects**: 미해결 불양 목록
 * 3. **selectedIds**: 선택된 불양 ID 배열
 * 4. **reason**: 조치 사유 텍스트
 */

"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
} from "lucide-react";

/**
 * 불양 데이터 모델
 */
interface Defect {
  id: string;
  code: string;
  name: string;
  type: "APPEARANCE" | "FUNCTION" | "PL" | "COMMON_SENSE";
  timestamp: string;
  resolved?: boolean;
}

/**
 * 모달 Props
 */
interface DefectResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolved?: () => void; // 불양 해결 후 콜백 (화면 새로고침용)
}

/**
 * 불양 타입별 색상 및 라벨
 */
const defectTypeMap: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  APPEARANCE: { label: "외관", color: "text-blue-400", bgColor: "bg-blue-500/20" },
  FUNCTION: { label: "기능", color: "text-yellow-400", bgColor: "bg-yellow-500/20" },
  PL: { label: "안전", color: "text-red-400", bgColor: "bg-red-500/20" },
  COMMON_SENSE: { label: "상식", color: "text-purple-400", bgColor: "bg-purple-500/20" },
};

export default function DefectResolutionModal({
  isOpen,
  onClose,
  onResolved,
}: DefectResolutionModalProps) {
  const [unresolvedDefects, setUnresolvedDefects] = useState<Defect[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["all"])
  );

  /**
   * 미해결 불양 조회
   */
  const fetchUnresolvedDefects = async () => {
    try {
      setFetching(true);
      const res = await axios.get("/api/defects/resolve");
      setUnresolvedDefects(res.data || []);
    } catch (error) {
      console.error("Failed to fetch unresolved defects", error);
      setMessage("미해결 불양 조회에 실패했습니다.");
    } finally {
      setFetching(false);
    }
  };

  /**
   * 모달 오픈 시 불양 조회
   */
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setReason("");
      setMessage("");
      fetchUnresolvedDefects();
    }
  }, [isOpen]);

  /**
   * 불양 선택 토글
   */
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  /**
   * 모든 불양 선택
   */
  const selectAll = () => {
    const allIds = new Set(unresolvedDefects.map((d) => d.id));
    setSelectedIds(allIds);
  };

  /**
   * 모든 선택 해제
   */
  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  /**
   * 불양 해결 처리
   */
  const handleResolve = async () => {
    if (selectedIds.size === 0) {
      setMessage("해결할 불양을 선택해주세요.");
      return;
    }

    if (!reason.trim()) {
      setMessage("조치 사유를 입력해주세요.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post("/api/defects/resolve", {
        defect_ids: Array.from(selectedIds),
        reason: reason.trim(),
      });

      setMessage(res.data.message);

      // 2초 후 모달 닫기
      setTimeout(() => {
        setSelectedIds(new Set());
        setReason("");
        setMessage("");
        onClose();
        onResolved?.(); // 화면 새로고침 콜백
      }, 1500);
    } catch (error) {
      console.error("Failed to resolve defects", error);
      setMessage("불양 해결 처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 섹션 펼침/접힘 토글
   */
  const toggleSection = (section: string) => {
    const newSections = new Set(expandedSections);
    if (newSections.has(section)) {
      newSections.delete(section);
    } else {
      newSections.add(section);
    }
    setExpandedSections(newSections);
  };

  /**
   * 불양 코드별로 그룹화
   */
  const groupedByCode = unresolvedDefects.reduce(
    (acc, defect) => {
      if (!acc[defect.code]) {
        acc[defect.code] = [];
      }
      acc[defect.code].push(defect);
      return acc;
    },
    {} as Record<string, Defect[]>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <h2 className="text-xl font-bold">조치이력등록</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 메시지 */}
          {message && (
            <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300 text-sm">{message}</p>
            </div>
          )}

          {/* 로딩 상태 */}
          {fetching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <span className="ml-2 text-slate-300">미해결 불양을 불러오는 중...</span>
            </div>
          ) : unresolvedDefects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <CheckCircle2 className="w-12 h-12 mb-4 text-emerald-400" />
              <p className="text-lg">해결할 불양이 없습니다.</p>
              <p className="text-sm mt-2">모든 불양이 정상 처리되었습니다.</p>
            </div>
          ) : (
            <>
              {/* 선택 도구 */}
              <div className="mb-6 flex gap-2">
                <button
                  onClick={selectAll}
                  className="px-3 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-colors text-sm font-medium"
                >
                  전체선택
                </button>
                <button
                  onClick={deselectAll}
                  className="px-3 py-2 bg-slate-700/50 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                >
                  해제
                </button>
                <div className="ml-auto text-sm text-slate-400">
                  {selectedIds.size}/{unresolvedDefects.length}개 선택됨
                </div>
              </div>

              {/* 불양 그룹 */}
              <div className="space-y-3 mb-6">
                {Object.entries(groupedByCode).map(([code, defects]) => {
                  const isExpanded = expandedSections.has(code);
                  const defectInfo = defectTypeMap[defects[0].type] || {
                    label: "기타",
                    color: "text-gray-400",
                    bgColor: "bg-gray-500/20",
                  };

                  return (
                    <div
                      key={code}
                      className="border border-slate-700 rounded-lg overflow-hidden bg-slate-800/50"
                    >
                      {/* 그룹 헤더 */}
                      <button
                        onClick={() => toggleSection(code)}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={defects.every((d) => selectedIds.has(d.id))}
                            onChange={() => {
                              if (defects.every((d) => selectedIds.has(d.id))) {
                                // 모두 선택 해제
                                const newSelected = new Set(selectedIds);
                                defects.forEach((d) => newSelected.delete(d.id));
                                setSelectedIds(newSelected);
                              } else {
                                // 모두 선택
                                const newSelected = new Set(selectedIds);
                                defects.forEach((d) => newSelected.add(d.id));
                                setSelectedIds(newSelected);
                              }
                            }}
                            className="w-4 h-4 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${defectInfo.bgColor} ${defectInfo.color}`}
                          >
                            {code}
                          </span>
                          <span className="text-sm text-slate-300">
                            {defects[0].name}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({defects.length}건)
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-slate-400 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* 불양 목록 */}
                      {isExpanded && (
                        <div className="border-t border-slate-700 bg-slate-900/50 p-3 space-y-2">
                          {defects.map((defect) => {
                            const defectTime = new Date(defect.timestamp);
                            const timeStr = `${String(defectTime.getHours()).padStart(
                              2,
                              "0"
                            )}:${String(defectTime.getMinutes()).padStart(2, "0")}`;

                            return (
                              <label
                                key={defect.id}
                                className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(defect.id)}
                                  onChange={() => toggleSelection(defect.id)}
                                  className="w-4 h-4"
                                />
                                <span className="text-xs text-slate-500 w-12">
                                  {timeStr}
                                </span>
                                <span className="text-sm text-slate-300 flex-1">
                                  {defect.name}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 조치 사유 입력 */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  조치 사유
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="불양 조치 내용을 입력해주세요. (예: 불량 부품 교체 완료)"
                  rows={4}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none resize-none"
                  disabled={loading}
                />
              </div>
            </>
          )}
        </div>

        {/* 푸터 */}
        {unresolvedDefects.length > 0 && (
          <div className="border-t border-slate-700 p-6 bg-slate-800/50 flex gap-3">
            <button
              onClick={onClose}
              disabled={loading || fetching}
              className="flex-1 px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleResolve}
              disabled={loading || fetching || selectedIds.size === 0 || !reason.trim()}
              className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              해결 처리
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
