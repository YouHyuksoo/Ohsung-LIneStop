/**
 * @file src/app/defects/page.tsx
 * @description
 * 불량 이력 조회 페이지 컴포넌트
 *
 * 주요 기능:
 * 1. 과거 불량 데이터 조회 및 필터링
 * 2. 날짜 범위 필터
 * 3. 불량 코드별 필터
 * 4. 페이지네이션
 * 5. 엑셀 다운로드
 * 6. 차트 및 통계
 */

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import {
  Database,
  Calendar,
  ArrowLeft,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Search,
  History,
} from "lucide-react";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";

interface Defect {
  id: string;
  code: string;
  name: string;
  timestamp: string;
  resolved: boolean;
}

export default function DefectsPage() {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);

  // 필터 입력 상태 (사용자가 입력 중인 값)
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [selectedCodeInput, setSelectedCodeInput] = useState<string>("all");

  // 실제 적용된 필터 상태 (조회 버튼 클릭 시 적용)
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCode, setSelectedCode] = useState<string>("all");

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  /**
   * 불량 이력 조회
   */
  const fetchDefects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/defects");
      setDefects(res.data);
    } catch (error) {
      console.error("Failed to fetch defects", error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 컴포넌트 마운트 시 데이터 조회
   */
  useEffect(() => {
    fetchDefects();
  }, [fetchDefects]);

  /**
   * 필터링된 데이터
   */
  const filteredDefects = useMemo(() => {
    let filtered = [...defects];

    // 날짜 필터
    if (startDate && endDate) {
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));
      filtered = filtered.filter((d) =>
        isWithinInterval(new Date(d.timestamp), { start, end })
      );
    }

    // 코드 필터
    if (selectedCode !== "all") {
      filtered = filtered.filter((d) => d.code === selectedCode);
    }

    return filtered;
  }, [defects, startDate, endDate, selectedCode]);

  /**
   * 페이지네이션된 데이터
   */
  const paginatedDefects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredDefects.slice(startIndex, endIndex);
  }, [filteredDefects, currentPage]);

  const totalPages = Math.ceil(filteredDefects.length / itemsPerPage);

  /**
   * 고유 불량 코드 목록
   */
  const uniqueCodes = useMemo(() => {
    return Array.from(new Set(defects.map((d) => d.code)));
  }, [defects]);

  /**
   * 코드별 통계
   */
  const codeStats = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredDefects.forEach((d) => {
      stats[d.code] = (stats[d.code] || 0) + 1;
    });
    return Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [filteredDefects]);

  /**
   * 엑셀 다운로드
   */
  const handleExcelDownload = () => {
    // CSV 형식으로 생성
    const headers = ["ID", "Code", "Name", "Timestamp", "Status"];
    const rows = filteredDefects.map((d, i) => [
      i + 1,
      d.code,
      d.name,
      format(new Date(d.timestamp), "yyyy-MM-dd HH:mm:ss"),
      d.resolved ? "Resolved" : "Pending",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `defects_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    link.click();
  };

  /**
   * 조회 버튼 클릭 시 필터 적용
   */
  const handleSearch = () => {
    setStartDate(startDateInput);
    setEndDate(endDateInput);
    setSelectedCode(selectedCodeInput);
    setCurrentPage(1);
    fetchDefects(); // 최신 데이터 다시 조회
  };

  /**
   * 필터 초기화
   */
  const handleResetFilters = () => {
    setStartDateInput("");
    setEndDateInput("");
    setSelectedCodeInput("all");
    setStartDate("");
    setEndDate("");
    setSelectedCode("all");
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto">
      {/* 헤더 */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl border border-blue-500/30">
            <History className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">불량 이력 조회</h1>
            <p className="text-muted-foreground text-sm mt-1">
              과거 불량 발생 이력을 조회하고 분석합니다.
            </p>
          </div>
        </div>
      </header>

      {/* 필터 섹션 */}
      <div className="filter-section mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold">필터</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 시작 날짜 */}
          <div>
            <label className="block text-sm font-medium mb-2">시작 날짜</label>
            <input
              type="date"
              value={startDateInput}
              onChange={(e) => setStartDateInput(e.target.value)}
              className="w-full p-2 rounded border bg-background"
            />
          </div>

          {/* 종료 날짜 */}
          <div>
            <label className="block text-sm font-medium mb-2">종료 날짜</label>
            <input
              type="date"
              value={endDateInput}
              onChange={(e) => setEndDateInput(e.target.value)}
              className="w-full p-2 rounded border bg-background"
            />
          </div>

          {/* 불량 코드 */}
          <div>
            <label className="block text-sm font-medium mb-2">불량 코드</label>
            <select
              value={selectedCodeInput}
              onChange={(e) => setSelectedCodeInput(e.target.value)}
              className="w-full p-2 rounded border bg-background"
            >
              <option value="all">전체</option>
              {uniqueCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          {/* 버튼 */}
          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              className="flex-1 px-4 py-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.8)] text-white rounded transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              조회
            </button>
            <button
              onClick={handleResetFilters}
              className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded transition-colors"
            >
              초기화
            </button>
          </div>
        </div>
      </div>

      {/* 차트 섹션 */}
      {codeStats.length > 0 && (
        <div className="filter-section mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold">상위 5개 불량 코드</h2>
          </div>
          <div className="space-y-3">
            {codeStats.map(([code, count]) => {
              const percentage = (count / filteredDefects.length) * 100;
              return (
                <div key={code}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-mono font-bold text-blue-400">
                      {code}
                    </span>
                    <span className="text-muted-foreground">
                      {count}회 ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 불량 이력 테이블 */}
      <div className="table-container">
        <div className="p-6 border-b border-border/50 flex items-center justify-between">
          <h2 className="text-xl font-semibold">불량 기록</h2>
          <button
            onClick={handleExcelDownload}
            disabled={filteredDefects.length === 0}
            className="px-6 py-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.8)] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Excel 다운로드
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-secondary/50">
              <tr className="border-b border-border/50">
                <th className="p-4 font-semibold">ID</th>
                <th className="p-4 font-semibold">코드</th>
                <th className="p-4 font-semibold">불량명</th>
                <th className="p-4 font-semibold">발생 시각</th>
                <th className="p-4 font-semibold">상태</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDefects.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-12 text-center text-muted-foreground"
                  >
                    <Database className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg">검색 결과가 없습니다.</p>
                    <p className="text-sm mt-2">필터 조건을 변경해보세요.</p>
                  </td>
                </tr>
              ) : (
                paginatedDefects.map((defect, index) => (
                  <tr
                    key={defect.id}
                    className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                  >
                    <td className="p-4 font-mono text-sm text-muted-foreground">
                      #{(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="p-4">
                      <span className="font-mono font-bold text-blue-400">
                        {defect.code}
                      </span>
                    </td>
                    <td className="p-4">{defect.name}</td>
                    <td className="p-4 font-mono text-sm">
                      {format(
                        new Date(defect.timestamp),
                        "yyyy-MM-dd HH:mm:ss"
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          defect.resolved
                            ? "bg-green-500/20 text-green-500"
                            : "bg-yellow-500/20 text-yellow-500"
                        }`}
                      >
                        {defect.resolved ? "해결됨" : "대기중"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {filteredDefects.length > 0 && (
          <div className="p-4 border-t border-border/50 bg-secondary/20 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              전체 {filteredDefects.length}개 중{" "}
              {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredDefects.length)}개
              표시
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 hover:bg-secondary rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    // 첫 페이지, 마지막 페이지, 현재 페이지 주변만 표시
                    return (
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1
                    );
                  })
                  .map((page, i, arr) => (
                    <div key={page} className="flex items-center">
                      {i > 0 && arr[i - 1] !== page - 1 && (
                        <span className="px-2 text-muted-foreground">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded ${
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : "hover:bg-secondary"
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  ))}
              </div>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 hover:bg-secondary rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
