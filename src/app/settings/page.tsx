/**
 * @file src/app/settings/page.tsx
 * @description
 * 시스템 설정 페이지
 * - 모니터링 주기, PLC/DB Mock 모드, 윈도우 시간 등의 설정 관리
 * - 실시간 설정 저장 및 불러오기
 *
 * 주요 기능:
 * 1. **모니터링 설정**: DB 폴링 주기 조정 (0-600초, 즉 0초~10분)
 * 2. **Mock 모드 설정**: PLC/DB Mock 모드 활성화/비활성화
 * 3. **Mock DB 불량 확률**: Mock 모드에서 불량 생성 확률 조정 (10-90%)
 * 4. **윈도우 시간 설정**: 불량 집계 윈도우 시간 조정 (1-24시간)
 * 5. **알림 설정**: 브라우저 알림, 소리 알림 활성화/비활성화
 *
 * 동작 원리:
 * - GET /api/settings로 현재 설정 불러오기
 * - POST /api/settings로 설정 저장
 * - 설정 변경 시 즉시 서버에 반영
 * - 폴링 주기가 0초면 매 사이클마다 폴링 (최대 빈도)
 * - 폴링 주기가 600초면 10분마다 한 번 폴링 (최소 빈도)
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Bell,
  Volume2,
  Clock,
  Cpu,
  Database,
  Settings as SettingsIcon,
  Network,
} from "lucide-react";
import axios from "axios";
// import ProtectedRoute from "@/components/ProtectedRoute"; // Login feature removed

/**
 * 설정 데이터 타입
 */
interface Settings {
  polling: {
    interval: number; // 폴링 주기 (초)
  };
  mock: {
    plc: boolean; // PLC Mock 모드
    db: boolean; // DB Mock 모드
    db_defect_probability?: number; // DB 불량 생성 확률 (0.1 ~ 0.9)
  };
  window: {
    duration: number; // 윈도우 시간 (시간)
  };
  notification: {
    browser: boolean; // 브라우저 알림
    sound: boolean; // 소리 알림
  };
  plc?: {
    ip: string;
    port: number;
    address: string;
    ascii?: boolean; // ASCII 모드 (true) / Binary 모드 (false)
  };
  db?: {
    host: string;
    port: number;
    service: string;
    user: string;
    password: string;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    polling: { interval: 5 }, // 기본값: 5초
    mock: { plc: true, db: true, db_defect_probability: 0.3 },
    window: { duration: 1 },
    notification: { browser: true, sound: true },
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingPLC, setTestingPLC] = useState(false);
  const [testingDB, setTestingDB] = useState(false);
  const [plcTestResult, setPlcTestResult] = useState<{
    success: boolean;
    message: string;
    mockMode?: boolean;
  } | null>(null);
  const [dbTestResult, setDbTestResult] = useState<{
    success: boolean;
    message: string;
    mockMode?: boolean;
  } | null>(null);
  const [icmpTestResult, setIcmpTestResult] = useState<{
    success: boolean;
    message: string;
    mockMode?: boolean;
  } | null>(null);
  const [testingICMP, setTestingICMP] = useState(false);
  const [testingPLCControl, setTestingPLCControl] = useState<0 | 1 | 2 | null>(null);
  const [plcControlResult, setPlcControlResult] = useState<{
    success: boolean;
    message: string;
    action?: number;
    mockMode?: boolean;
  } | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  /**
   * 설정 불러오기
   */
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/settings");
      setSettings(response.data);
      showMessage("success", "설정을 불러왔습니다.");
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      showMessage("error", "설정 불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 설정 저장하기
   */
  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.post("/api/settings", settings);
      showMessage("success", "설정이 저장되었습니다.");
    } catch (error) {
      console.error("Failed to save settings:", error);
      showMessage("error", "설정 저장 실패");
    } finally {
      setSaving(false);
    }
  };

  /**
   * 메시지 표시
   */
  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  /**
   * 설정 리셋 (기본값으로)
   */
  const resetSettings = () => {
    if (confirm("설정을 기본값으로 초기화하시겠습니까?")) {
      setSettings({
        polling: { interval: 5 }, // 기본값: 5초
        mock: { plc: true, db: true, db_defect_probability: 0.3 },
        window: { duration: 1 },
        notification: { browser: true, sound: true },
      });
      showMessage("success", "설정이 기본값으로 초기화되었습니다.");
    }
  };

  /**
   * PLC 연결 테스트 함수
   */
  const testPLCConnection = async () => {
    setTestingPLC(true);
    setPlcTestResult(null);
    try {
      const res = await axios.get("/api/plc-test");
      setPlcTestResult({
        success: res.data.success !== false,
        message: res.data.message || "PLC 연결에 성공했습니다.",
        mockMode: res.data.mockMode,
      });
      if (res.data.success !== false) {
        showMessage("success", res.data.message || "PLC 연결에 성공했습니다.");
      } else {
        showMessage("error", `PLC 연결 실패: ${res.data.message}`);
      }
    } catch (err: any) {
      console.error("PLC connection test failed:", err);
      // HTTP 에러 응답에서 데이터 추출
      const responseData = err.response?.data || {};
      const errorMessage =
        responseData.message || err.message || "알 수 없는 오류";
      setPlcTestResult({
        success: false,
        message: errorMessage,
        mockMode: responseData.mockMode,
      });
      showMessage("error", `PLC 연결 실패: ${errorMessage}`);
    } finally {
      setTestingPLC(false);
    }
  };

  /**
   * DB 연결 테스트 함수
   */
  const testDBConnection = async () => {
    setTestingDB(true);
    setDbTestResult(null);
    try {
      const res = await axios.get("/api/db-test");
      setDbTestResult({
        success: res.data.success !== false,
        message: res.data.message || "DB 연결에 성공했습니다.",
        mockMode: res.data.mockMode,
      });
      if (res.data.success !== false) {
        showMessage("success", res.data.message || "DB 연결에 성공했습니다.");
      } else {
        showMessage("error", `DB 연결 실패: ${res.data.message}`);
      }
    } catch (err: any) {
      console.error("DB connection test failed:", err);
      // HTTP 에러 응답에서 데이터 추출
      const responseData = err.response?.data || {};
      const errorMessage =
        responseData.message || err.message || "알 수 없는 오류";
      setDbTestResult({
        success: false,
        message: errorMessage,
        mockMode: responseData.mockMode,
      });
      showMessage("error", `DB 연결 실패: ${errorMessage}`);
    } finally {
      setTestingDB(false);
    }
  };

  /**
   * ICMP Ping 테스트 함수
   */
  const testICMPConnection = async () => {
    setTestingICMP(true);
    setIcmpTestResult(null);
    try {
      const res = await axios.get("/api/plc-test?step=icmp");
      setIcmpTestResult({
        success: res.data.success !== false,
        message: res.data.message || "ICMP Ping 성공",
        mockMode: res.data.mockMode,
      });
      if (res.data.success !== false) {
        showMessage("success", res.data.message || "ICMP Ping 성공");
      } else {
        showMessage("error", `ICMP Ping 실패: ${res.data.message}`);
      }
    } catch (err: any) {
      console.error("ICMP Ping test failed:", err);
      const responseData = err.response?.data || {};
      const errorMessage =
        responseData.message || err.message || "알 수 없는 오류";
      setIcmpTestResult({
        success: false,
        message: errorMessage,
        mockMode: responseData.mockMode,
      });
      showMessage("error", `ICMP Ping 실패: ${errorMessage}`);
    } finally {
      setTestingICMP(false);
    }
  };

  /**
   * PLC 제어 테스트 함수 (0: 해제, 1: 경고, 2: 정지)
   */
  const testPLCControl = async (value: 0 | 1 | 2) => {
    setTestingPLCControl(value);
    setPlcControlResult(null);

    const actionLabels: Record<number, string> = {
      0: "해제 (라인 가동)",
      1: "경고 (알람)",
      2: "정지",
    };

    try {
      const res = await axios.post("/api/plc-control", {
        address: settings.plc?.address || "D7000,1",
        value: value,
      });

      setPlcControlResult({
        success: res.data.success !== false,
        message: res.data.message || `PLC에 ${actionLabels[value]} 신호를 전송했습니다.`,
        action: value,
        mockMode: res.data.mockMode || settings.mock?.plc,
      });

      if (res.data.success !== false) {
        showMessage("success", `✓ ${actionLabels[value]} 신호 전송 성공`);
      } else {
        showMessage("error", `✕ ${actionLabels[value]} 신호 전송 실패: ${res.data.message}`);
      }
    } catch (err: any) {
      console.error("PLC control failed:", err);
      const responseData = err.response?.data || {};
      const errorMessage =
        responseData.message || err.message || "알 수 없는 오류";

      setPlcControlResult({
        success: false,
        message: errorMessage,
        action: value,
        mockMode: settings.mock?.plc,
      });
      showMessage("error", `✕ ${actionLabels[value]} 신호 전송 실패: ${errorMessage}`);
    } finally {
      setTestingPLCControl(null);
    }
  };

  // 컴포넌트 마운트 시 설정 불러오기
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* 헤더 */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[hsl(var(--primary)/0.1)] rounded-xl border border-[hsl(var(--primary)/0.3)]">
                <SettingsIcon className="w-8 h-8 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  시스템 설정
                </h1>
                <p className="text-muted-foreground mt-1">
                  모니터링 시스템 동작을 설정합니다
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex gap-3">
                <button
                  onClick={resetSettings}
                  className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  초기화
                </button>
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 메시지 알림 */}
        {message && (
          <div
            className={`max-w-7xl mx-auto mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-500/20 border border-green-500/50 text-green-400"
                : "bg-red-500/20 border border-red-500/50 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 설정 섹션들 */}
        <div className="max-w-7xl mx-auto space-y-6">
          {/* PLC 설정 */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <Cpu className="w-6 h-6 text-orange-400" />
              <h2 className="text-xl font-bold text-foreground">PLC 설정</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    IP 주소
                  </label>
                  <input
                    type="text"
                    value={settings.plc?.ip || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        plc: {
                          port: settings.plc?.port || 0,
                          address: settings.plc?.address || "",
                          ip: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-card border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-[hsl(var(--primary))]"
                    placeholder="192.168.0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    포트
                  </label>
                  <input
                    type="number"
                    value={settings.plc?.port || 0}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        plc: {
                          ip: settings.plc?.ip || "",
                          address: settings.plc?.address || "",
                          port: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full bg-card border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-[hsl(var(--primary))]"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    제어 주소 (mcprotocol 형식)
                  </label>
                  <input
                    type="text"
                    value={settings.plc?.address || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        plc: {
                          ip: settings.plc?.ip || "",
                          port: settings.plc?.port || 0,
                          address: e.target.value,
                          ascii: settings.plc?.ascii ?? true,
                        },
                      })
                    }
                    className="w-full bg-card border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-[hsl(var(--primary))]"
                    placeholder="D7000,1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    PLC 통신 모드
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setSettings({
                          ...settings,
                          plc: {
                            ip: settings.plc?.ip || "",
                            port: settings.plc?.port || 0,
                            address: settings.plc?.address || "",
                            ascii: true,
                          },
                        })
                      }
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors border ${
                        settings.plc?.ascii !== false
                          ? "bg-blue-500/20 border-blue-500/50 text-blue-600"
                          : "bg-card border-border text-foreground/60 hover:bg-card/80"
                      }`}
                    >
                      ASCII 모드
                    </button>
                    <button
                      onClick={() =>
                        setSettings({
                          ...settings,
                          plc: {
                            ip: settings.plc?.ip || "",
                            port: settings.plc?.port || 0,
                            address: settings.plc?.address || "",
                            ascii: false,
                          },
                        })
                      }
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors border ${
                        settings.plc?.ascii === false
                          ? "bg-purple-500/20 border-purple-500/50 text-purple-600"
                          : "bg-card border-border text-foreground/60 hover:bg-card/80"
                      }`}
                    >
                      Binary 모드
                    </button>
                  </div>
                  <p className="text-xs text-foreground/50 mt-2">
                    {settings.plc?.ascii !== false
                      ? "ASCII 모드 사용 중 (더 안정적인 텍스트 기반 통신)"
                      : "Binary 모드 사용 중 (더 빠른 바이너리 통신)"}
                  </p>
                </div>
              </div>
              {/* PLC 연결 테스트 버튼 */}
              <div className="pt-4 border-t border-border space-y-3">
                <button
                  onClick={testPLCConnection}
                  disabled={testingPLC}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500/20 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testingPLC ? (
                    <>
                      <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      테스트 중...
                    </>
                  ) : (
                    <>
                      <Cpu className="w-5 h-5" />
                      PLC 연결 테스트
                    </>
                  )}
                </button>
                {/* 테스트 결과 */}
                {plcTestResult && (
                  <div
                    className={`p-3 rounded-lg border ${
                      plcTestResult.success
                        ? plcTestResult.mockMode
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-600"
                          : "bg-green-500/10 border-green-500/30 text-green-600"
                        : "bg-red-500/10 border-red-500/30 text-red-600"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {plcTestResult.success ? (
                        <div
                          className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                            plcTestResult.mockMode
                              ? "text-blue-600"
                              : "text-green-600"
                          }`}
                        >
                          {plcTestResult.mockMode ? "⚡" : "✓"}
                        </div>
                      ) : (
                        <div className="w-5 h-5 mt-0.5 text-red-600 flex-shrink-0">
                          ✕
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {plcTestResult.success
                            ? plcTestResult.mockMode
                              ? "Mock 모드"
                              : "연결 성공"
                            : "연결 실패"}
                        </p>
                        <p className="text-xs opacity-80 mt-1">
                          {plcTestResult.message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ICMP Ping 테스트 버튼 */}
                <button
                  onClick={testICMPConnection}
                  disabled={testingICMP}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-500/10 text-slate-500 border border-slate-500/20 hover:bg-slate-500/20 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testingICMP ? (
                    <>
                      <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                      테스트 중...
                    </>
                  ) : (
                    <>
                      <Network className="w-5 h-5" />
                      ICMP Ping (단순 연결 확인)
                    </>
                  )}
                </button>
                {/* ICMP 테스트 결과 */}
                {icmpTestResult && (
                  <div
                    className={`p-3 rounded-lg border ${
                      icmpTestResult.success
                        ? icmpTestResult.mockMode
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-600"
                          : "bg-green-500/10 border-green-500/30 text-green-600"
                        : "bg-red-500/10 border-red-500/30 text-red-600"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {icmpTestResult.success ? (
                        <div
                          className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                            icmpTestResult.mockMode
                              ? "text-blue-600"
                              : "text-green-600"
                          }`}
                        >
                          {icmpTestResult.mockMode ? "⚡" : "✓"}
                        </div>
                      ) : (
                        <div className="w-5 h-5 mt-0.5 text-red-600 flex-shrink-0">
                          ✕
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {icmpTestResult.success
                            ? icmpTestResult.mockMode
                              ? "Mock 모드"
                              : "ICMP Ping 성공"
                            : "ICMP Ping 실패"}
                        </p>
                        <p className="text-xs opacity-80 mt-1">
                          {icmpTestResult.message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* PLC 제어 테스트 버튼 그룹 */}
                <div className="pt-4 border-t border-border space-y-3">
                  <h3 className="text-sm font-medium text-foreground">
                    PLC 제어 테스트 (주소: {settings.plc?.address || "D7000,1"})
                  </h3>

                  {/* Mock 모드 상태 표시 */}
                  <div className={`p-3 rounded-lg border ${
                    settings.mock?.plc
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-600"
                      : "bg-yellow-500/10 border-yellow-500/30 text-yellow-600"
                  }`}>
                    <p className="text-xs font-medium">
                      {settings.mock?.plc
                        ? "⚡ PLC Mock 모드 활성화됨"
                        : "⚠️ 실제 PLC 모드 - 연결된 PLC가 필요합니다"}
                    </p>
                    <p className="text-xs opacity-80 mt-1">
                      {settings.mock?.plc
                        ? "테스트 버튼은 시뮬레이션으로 동작합니다"
                        : "테스트 버튼은 실제 PLC에 명령을 전송합니다"}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* 해제 (0) 버튼 */}
                    <button
                      onClick={() => testPLCControl(0)}
                      disabled={testingPLCControl !== null}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500/20 rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {testingPLCControl === 0 ? (
                        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "0️⃣"
                      )}
                      {testingPLCControl === 0 ? "중..." : "해제"}
                    </button>

                    {/* 경고 (1) 버튼 */}
                    <button
                      onClick={() => testPLCControl(1)}
                      disabled={testingPLCControl !== null}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 hover:bg-yellow-500/20 rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {testingPLCControl === 1 ? (
                        <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "1️⃣"
                      )}
                      {testingPLCControl === 1 ? "중..." : "경고"}
                    </button>

                    {/* 정지 (2) 버튼 */}
                    <button
                      onClick={() => testPLCControl(2)}
                      disabled={testingPLCControl !== null}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20 rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {testingPLCControl === 2 ? (
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "2️⃣"
                      )}
                      {testingPLCControl === 2 ? "중..." : "정지"}
                    </button>
                  </div>

                  {/* PLC 제어 결과 */}
                  {plcControlResult && (
                    <div
                      className={`p-3 rounded-lg border ${
                        plcControlResult.success
                          ? plcControlResult.mockMode
                            ? "bg-blue-500/10 border-blue-500/30 text-blue-600"
                            : "bg-green-500/10 border-green-500/30 text-green-600"
                          : "bg-red-500/10 border-red-500/30 text-red-600"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {plcControlResult.success ? (
                          <div className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                            plcControlResult.mockMode
                              ? "text-blue-600"
                              : "text-green-600"
                          }`}>
                            {plcControlResult.mockMode ? "⚡" : "✓"}
                          </div>
                        ) : (
                          <div className="w-5 h-5 mt-0.5 text-red-600 flex-shrink-0">
                            ✕
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {plcControlResult.success
                              ? plcControlResult.mockMode
                                ? "Mock 모드 시뮬레이션"
                                : "실제 PLC 전송 성공"
                              : "전송 실패"}
                          </p>
                          <p className="text-xs opacity-80 mt-1">
                            {plcControlResult.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 데이터베이스 설정 */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <Database className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-bold text-foreground">
                Oracle DB 설정
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    호스트
                  </label>
                  <input
                    type="text"
                    value={settings.db?.host || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        db: {
                          port: settings.db?.port || 0,
                          service: settings.db?.service || "",
                          user: settings.db?.user || "",
                          password: settings.db?.password || "",
                          host: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-card border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-[hsl(var(--primary))]"
                    placeholder="localhost"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    포트
                  </label>
                  <input
                    type="number"
                    value={settings.db?.port || 0}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        db: {
                          host: settings.db?.host || "",
                          service: settings.db?.service || "",
                          user: settings.db?.user || "",
                          password: settings.db?.password || "",
                          port: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full bg-card border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-[hsl(var(--primary))]"
                    placeholder="1521"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    서비스명
                  </label>
                  <input
                    type="text"
                    value={settings.db?.service || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        db: {
                          host: settings.db?.host || "",
                          port: settings.db?.port || 0,
                          user: settings.db?.user || "",
                          password: settings.db?.password || "",
                          service: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-card border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-[hsl(var(--primary))]"
                    placeholder="xe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    사용자
                  </label>
                  <input
                    type="text"
                    value={settings.db?.user || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        db: {
                          host: settings.db?.host || "",
                          port: settings.db?.port || 0,
                          service: settings.db?.service || "",
                          password: settings.db?.password || "",
                          user: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-card border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-[hsl(var(--primary))]"
                    placeholder="system"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    value={settings.db?.password || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        db: {
                          host: settings.db?.host || "",
                          port: settings.db?.port || 0,
                          service: settings.db?.service || "",
                          user: settings.db?.user || "",
                          password: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-card border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-[hsl(var(--primary))]"
                    placeholder="비밀번호"
                  />
                </div>
              </div>

              {/* DB 연결 테스트 버튼 */}
              <div className="pt-4 border-t border-border space-y-3">
                <button
                  onClick={testDBConnection}
                  disabled={testingDB}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 hover:bg-cyan-500/20 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testingDB ? (
                    <>
                      <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      테스트 중...
                    </>
                  ) : (
                    <>
                      <Database className="w-5 h-5" />
                      DB 연결 테스트
                    </>
                  )}
                </button>
                {/* 테스트 결과 */}
                {dbTestResult && (
                  <div
                    className={`p-3 rounded-lg border ${
                      dbTestResult.success
                        ? dbTestResult.mockMode
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-600"
                          : "bg-green-500/10 border-green-500/30 text-green-600"
                        : "bg-red-500/10 border-red-500/30 text-red-600"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {dbTestResult.success ? (
                        <div
                          className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                            dbTestResult.mockMode
                              ? "text-blue-600"
                              : "text-green-600"
                          }`}
                        >
                          {dbTestResult.mockMode ? "⚡" : "✓"}
                        </div>
                      ) : (
                        <div className="w-5 h-5 mt-0.5 text-red-600 flex-shrink-0">
                          ✕
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {dbTestResult.success
                            ? dbTestResult.mockMode
                              ? "Mock 모드"
                              : "연결 성공"
                            : "연결 실패"}
                        </p>
                        <p className="text-xs opacity-80 mt-1">
                          {dbTestResult.message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 모니터링 설정 & 윈도우 시간 설정 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 모니터링 설정 */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-3 mb-6">
                <Clock className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold text-foreground">
                  모니터링 설정
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    DB 폴링 주기:{" "}
                    {settings.polling.interval === 0
                      ? "즉시"
                      : settings.polling.interval < 60
                      ? `${settings.polling.interval}초`
                      : `${
                          Math.round((settings.polling.interval / 60) * 10) / 10
                        }분`}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="600"
                    value={settings.polling.interval}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        polling: { interval: parseInt(e.target.value) },
                      })
                    }
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[hsl(var(--primary))]"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>즉시 (매우 빠름)</span>
                    <span>10분 (느림)</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    데이터베이스를 조회하는 주기입니다. 짧을수록 불량을 빠르게
                    감지하지만 시스템 부하가 증가합니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 윈도우 시간 설정 */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-3 mb-6">
                <Database className="w-6 h-6 text-green-400" />
                <h2 className="text-xl font-bold text-foreground">
                  윈도우 시간 설정
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    불량 집계 윈도우: {settings.window.duration}시간
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="24"
                    value={settings.window.duration}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        window: { duration: parseInt(e.target.value) },
                      })
                    }
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[hsl(var(--accent))]"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>1시간</span>
                    <span>24시간</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mock 모드 설정 */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <Cpu className="w-6 h-6 text-[hsl(var(--primary))]" />
              <h2 className="text-xl font-bold text-foreground">
                Mock 모드 설정
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <h3 className="font-medium text-foreground">PLC Mock 모드</h3>
                  <p className="text-sm text-muted-foreground">
                    실제 PLC 없이 테스트 모드로 실행
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.mock.plc}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        mock: { ...settings.mock, plc: e.target.checked },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[hsl(var(--primary)/0.2)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[hsl(var(--primary))]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <h3 className="font-medium text-foreground">DB Mock 모드</h3>
                  <p className="text-sm text-muted-foreground">
                    실제 데이터베이스 없이 테스트 데이터 사용
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.mock.db}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        mock: { ...settings.mock, db: e.target.checked },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[hsl(var(--primary)/0.2)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[hsl(var(--primary))]"></div>
                </label>
              </div>

              {/* DB Mock 불량 생성 확률 */}
              {settings.mock.db && (
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Mock DB 불량 생성 확률:{" "}
                    {Math.round(
                      (settings.mock.db_defect_probability || 0.3) * 100
                    )}
                    %
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.1"
                    value={settings.mock.db_defect_probability || 0.3}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        mock: {
                          ...settings.mock,
                          db_defect_probability: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-[hsl(var(--primary))]"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>낮음 (10%)</span>
                    <span>높음 (90%)</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    폴링 주기마다 불량이 발생할 확률입니다. 높을수록 자주
                    발생합니다.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 알림 설정 */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-6 h-6 text-yellow-400" />
              <h2 className="text-xl font-bold text-foreground">알림 설정</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-yellow-400" />
                  <div>
                    <h3 className="font-medium text-foreground">
                      브라우저 알림
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      라인 정지 시 브라우저 알림 표시
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notification.browser}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notification: {
                          ...settings.notification,
                          browser: e.target.checked,
                        },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[hsl(var(--primary)/0.2)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[hsl(var(--accent))]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-yellow-400" />
                  <div>
                    <h3 className="font-medium text-foreground">소리 알림</h3>
                    <p className="text-sm text-muted-foreground">
                      라인 정지 시 알림음 재생
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notification.sound}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notification: {
                          ...settings.notification,
                          sound: e.target.checked,
                        },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[hsl(var(--primary)/0.2)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[hsl(var(--accent))]"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
