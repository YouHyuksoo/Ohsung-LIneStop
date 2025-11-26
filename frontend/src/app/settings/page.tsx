/**
 * @file src/app/settings/page.tsx
 * @description
 * 시스템 설정 페이지
 * - 모니터링 주기, PLC/DB Mock 모드, 윈도우 시간 등의 설정 관리
 * - 실시간 설정 저장 및 불러오기
 *
 * 주요 기능:
 * 1. **모니터링 설정**: 폴링 주기 조정 (1-10초)
 * 2. **Mock 모드 설정**: PLC/DB Mock 모드 활성화/비활성화
 * 3. **윈도우 시간 설정**: 불량 집계 윈도우 시간 조정 (1-24시간)
 * 4. **알림 설정**: 브라우저 알림, 소리 알림 활성화/비활성화
 *
 * 동작 원리:
 * - GET /api/settings로 현재 설정 불러오기
 * - POST /api/settings로 설정 저장
 * - 설정 변경 시 즉시 서버에 반영
 */

"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import axios from "axios";

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
    polling: { interval: 1 },
    mock: { plc: true, db: true },
    window: { duration: 1 },
    notification: { browser: true, sound: true },
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  /**
   * 설정 불러오기
   */
  const fetchSettings = async () => {
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
  };

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
        polling: { interval: 1 },
        mock: { plc: true, db: true },
        window: { duration: 1 },
        notification: { browser: true, sound: true },
      });
      showMessage("success", "설정이 기본값으로 초기화되었습니다.");
    }
  };

  // 컴포넌트 마운트 시 설정 불러오기
  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      {/* 헤더 */}
      <div className="max-w-4xl mx-auto mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          메인으로 돌아가기
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
              <SettingsIcon className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">시스템 설정</h1>
              <p className="text-gray-400 mt-1">
                모니터링 시스템 동작을 설정합니다
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={resetSettings}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              초기화
            </button>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>

      {/* 메시지 알림 */}
      {message && (
        <div
          className={`max-w-4xl mx-auto mb-6 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-500/20 border border-green-500/50 text-green-400"
              : "bg-red-500/20 border border-red-500/50 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 설정 섹션들 */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* PLC 설정 */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Cpu className="w-6 h-6 text-orange-400" />
            <h2 className="text-xl font-bold text-white">PLC 설정</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                placeholder="192.168.0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                placeholder="5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                어드레스
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
                    },
                  })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                placeholder="D100"
              />
            </div>
          </div>
        </div>

        {/* 데이터베이스 설정 */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Oracle DB 설정</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                호스트 (Host)
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
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                placeholder="localhost"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                포트 (Port)
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
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                placeholder="1521"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                서비스 이름 (Service Name)
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
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                placeholder="xe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                사용자 (User)
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
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                placeholder="system"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                비밀번호 (Password)
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
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                placeholder="비밀번호"
              />
            </div>
          </div>
        </div>

        {/* 모니터링 설정 */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">모니터링 설정</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                폴링 주기: {settings.polling.interval}초
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={settings.polling.interval}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    polling: { interval: parseInt(e.target.value) },
                  })
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1초 (빠름)</span>
                <span>10초 (느림)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mock 모드 설정 */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Cpu className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Mock 모드 설정</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div>
                <h3 className="font-medium text-white">PLC Mock 모드</h3>
                <p className="text-sm text-gray-400">
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
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div>
                <h3 className="font-medium text-white">DB Mock 모드</h3>
                <p className="text-sm text-gray-400">
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
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* 윈도우 시간 설정 */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-bold text-white">윈도우 시간 설정</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1시간</span>
                <span>24시간</span>
              </div>
            </div>
          </div>
        </div>

        {/* 알림 설정 */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-bold text-white">알림 설정</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-yellow-400" />
                <div>
                  <h3 className="font-medium text-white">브라우저 알림</h3>
                  <p className="text-sm text-gray-400">
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
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-yellow-400" />
                <div>
                  <h3 className="font-medium text-white">소리 알림</h3>
                  <p className="text-sm text-gray-400">
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
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
