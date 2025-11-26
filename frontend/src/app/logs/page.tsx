/**
 * @file src/app/logs/page.tsx
 * @description
 * 시스템 로그 조회 페이지
 * - 실시간 로그 스트리밍
 * - 로그 레벨별 필터링 (INFO, WARN, ERROR, DEBUG)
 * - 컴포넌트별 필터링 (Monitor, PLC, DB, API, System, Admin)
 * - 검색 기능
 *
 * 주요 기능:
 * 1. **실시간 로그 조회**: 1초마다 새 로그 자동 업데이트
 * 2. **필터링**: 레벨, 컴포넌트, 검색어로 필터링
 * 3. **자동 스크롤**: 새 로그 추가 시 자동으로 하단 스크롤
 * 4. **로그 삭제**: 모든 로그 일괄 삭제
 *
 * 동작 원리:
 * - GET /api/logs로 로그 목록 조회
 * - DELETE /api/logs로 로그 삭제
 * - 1초마다 폴링하여 실시간 업데이트
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Trash2,
  Filter,
  Search,
  Info,
  AlertTriangle,
  AlertCircle,
  Bug,
  RefreshCw,
} from "lucide-react";
import axios from "axios";
import { format } from "date-fns";

/**
 * 로그 엔트리 타입
 */
interface LogEntry {
  id: string;
  timestamp: Date;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  component: "Monitor" | "PLC" | "DB" | "API" | "System" | "Admin";
  message: string;
  metadata?: any;
}

/**
 * 로그 레벨별 아이콘 매핑
 */
const levelIcons = {
  INFO: Info,
  WARN: AlertTriangle,
  ERROR: AlertCircle,
  DEBUG: Bug,
};

/**
 * 로그 레벨별 색상 매핑
 */
const levelColors = {
  INFO: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  WARN: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  ERROR: "text-red-400 bg-red-500/10 border-red-500/30",
  DEBUG: "text-gray-400 bg-gray-500/10 border-gray-500/30",
};

/**
 * 컴포넌트별 색상 매핑
 */
const componentColors = {
  Monitor: "text-green-400",
  PLC: "text-purple-400",
  DB: "text-blue-400",
  API: "text-yellow-400",
  System: "text-orange-400",
  Admin: "text-pink-400",
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");
  const [selectedComponent, setSelectedComponent] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [loading, setLoading] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  /**
   * 로그 조회
   */
  const fetchLogs = async () => {
    try {
      const params: any = {};
      if (selectedLevel !== "ALL") params.level = selectedLevel;
      if (selectedComponent !== "ALL") params.component = selectedComponent;
      if (searchQuery) params.search = searchQuery;

      const response = await axios.get("/api/logs", { params });
      const newLogs = response.data.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp),
      }));
      setLogs(newLogs);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
  };

  /**
   * 로그 삭제
   */
  const clearLogs = async () => {
    if (!confirm("모든 로그를 삭제하시겠습니까?")) return;

    setLoading(true);
    try {
      await axios.delete("/api/logs");
      setLogs([]);
      setFilteredLogs([]);
    } catch (error) {
      console.error("Failed to clear logs:", error);
      alert("로그 삭제 실패");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 필터링 적용
   */
  useEffect(() => {
    let filtered = [...logs];

    if (selectedLevel !== "ALL") {
      filtered = filtered.filter((log) => log.level === selectedLevel);
    }

    if (selectedComponent !== "ALL") {
      filtered = filtered.filter((log) => log.component === selectedComponent);
    }

    if (searchQuery) {
      filtered = filtered.filter((log) =>
        log.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }, [logs, selectedLevel, selectedComponent, searchQuery]);

  /**
   * 자동 스크롤
   */
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredLogs, autoScroll]);

  /**
   * 실시간 폴링 (1초마다)
   */
  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 1000);
    return () => clearInterval(interval);
  }, [selectedLevel, selectedComponent, searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      {/* 헤더 */}
      <div className="max-w-7xl mx-auto mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          메인으로 돌아가기
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl border border-orange-500/30">
              <FileText className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">시스템 로그</h1>
              <p className="text-gray-400 mt-1">실시간 로그 모니터링</p>
            </div>
          </div>

          <button
            onClick={clearLogs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            로그 삭제
          </button>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 레벨 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Filter className="w-4 h-4 inline mr-2" />
                레벨
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">전체</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
                <option value="DEBUG">DEBUG</option>
              </select>
            </div>

            {/* 컴포넌트 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Filter className="w-4 h-4 inline mr-2" />
                컴포넌트
              </label>
              <select
                value={selectedComponent}
                onChange={(e) => setSelectedComponent(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">전체</option>
                <option value="Monitor">Monitor</option>
                <option value="PLC">PLC</option>
                <option value="DB">DB</option>
                <option value="API">API</option>
                <option value="System">System</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            {/* 검색 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Search className="w-4 h-4 inline mr-2" />
                검색
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="로그 메시지 검색..."
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 자동 스크롤 토글 */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              총 {filteredLogs.length}개의 로그
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-400">자동 스크롤</span>
            </label>
          </div>
        </div>
      </div>

      {/* 로그 목록 */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 h-[600px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FileText className="w-16 h-16 mb-4 opacity-50" />
              <p>로그가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2 font-mono text-sm">
              {filteredLogs.map((log) => {
                const LevelIcon = levelIcons[log.level];
                return (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border ${
                      levelColors[log.level]
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <LevelIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xs text-gray-500">
                            {format(log.timestamp, "yyyy-MM-dd HH:mm:ss")}
                          </span>
                          <span className="text-xs font-bold">
                            [{log.level}]
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              componentColors[log.component]
                            }`}
                          >
                            [{log.component}]
                          </span>
                        </div>
                        <p className="text-white break-words">{log.message}</p>
                        {log.metadata && (
                          <pre className="mt-2 text-xs text-gray-400 bg-gray-900/50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
