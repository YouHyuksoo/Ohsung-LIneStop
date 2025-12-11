/**
 * @file src/app/monitor/SystemStatusPanel.tsx
 * @description
 * 시스템 상태를 표시하는 패널 컴포넌트.
 * DB 폴링, PLC 연결 상태, 마지막 명령 등 시스템 전반의 상태를 시각화합니다.
 *
 * 주요 기능:
 * - DB 폴링 상태 및 주기 표시
 * - DB 모드 (Mock/Real) 표시
 * - PLC 연결 상태 표시
 * - PLC 모드 (Mock/Real) 표시
 * - 마지막 PLC 명령 및 시간 표시
 * - 시스템 이상 시 붉은 계열 배경 블링킹 애니메이션
 *
 * 사용 예시:
 * ```tsx
 * <SystemStatusPanel
 *   systemStatus={status.system_status}
 *   pollingInterval={status.polling_interval}
 * />
 * ```
 *
 * @deprecated
 * 블링킹 애니메이션은 global.css에 정의된 `@keyframes blinkRed` 애니메이션을 사용합니다.
 * DB 폴링이 정지되거나 PLC 연결이 끊긴 경우 자동으로 활성화됩니다.
 */

import {
  Server,
  Database,
  Radio,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

interface SystemStatus {
  db_polling: boolean;
  db_mode: "Mock" | "Real";
  plc_connected: boolean;
  plc_mode: "Mock" | "Real";
  last_plc_command: string | null;
  last_plc_command_type: "STOP" | "RESET" | null;
}

interface SystemStatusPanelProps {
  systemStatus?: SystemStatus;
  pollingInterval?: number;
}

const StatusItem = ({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center gap-2">
    {icon}
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="text-lg font-semibold">{children}</div>
    </div>
  </div>
);

export default function SystemStatusPanel({
  systemStatus,
  pollingInterval,
}: SystemStatusPanelProps) {
  if (!systemStatus) return null;

  // DB 폴링이 정지되었거나 PLC 연결이 끊겼는지 확인
  const isSystemAbnormal = !systemStatus.db_polling || !systemStatus.plc_connected;

  return (
    <div
      className={`sticky top-8 border-2 border-border rounded-xl p-6 shadow-sm mb-8 z-40 transition-all ${
        isSystemAbnormal ? "animate-blinkRed" : ""
      }`}
      style={{
        background: isSystemAbnormal
          ? "linear-gradient(to right, rgba(220, 38, 38, 0.4), rgba(185, 28, 28, 0.3), rgba(153, 27, 27, 0.2))"
          : "linear-gradient(to right, rgba(30, 58, 138, 0.4), rgba(30, 41, 89, 0.3), rgba(51, 65, 85, 0.2))",
      }}
    >
      <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
        <Server className="w-5 h-5 text-purple-400" />
        시스템 상태
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatusItem
          icon={<Clock className="w-5 h-5 text-purple-400" />}
          label="폴링 주기"
        >
          <p>
            {pollingInterval !== undefined
              ? pollingInterval < 60
                ? `${pollingInterval}초`
                : `${Math.round((pollingInterval / 60) * 10) / 10}분`
              : "설정 없음"}
          </p>
        </StatusItem>

        <StatusItem
          icon={<Database className="w-5 h-5 text-blue-400" />}
          label="DB 폴링"
        >
          <p>{systemStatus.db_polling ? "활성" : "정지"}</p>
        </StatusItem>

        <StatusItem
          icon={<Database className="w-5 h-5 text-cyan-400" />}
          label="DB 모드"
        >
          <p>{systemStatus.db_mode}</p>
        </StatusItem>

        <StatusItem
          icon={<Radio className="w-5 h-5 text-green-400" />}
          label="PLC 연결"
        >
          <p className="flex items-center gap-1">
            {systemStatus.plc_connected ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                연결됨
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-red-500" />
                끊김
              </>
            )}
          </p>
        </StatusItem>

        <StatusItem
          icon={<Radio className="w-5 h-5 text-yellow-400" />}
          label="PLC 모드"
        >
          <p>{systemStatus.plc_mode}</p>
        </StatusItem>

        <StatusItem
          icon={<Clock className="w-5 h-5 text-orange-400" />}
          label="마지막 명령"
        >
          <p>
            {systemStatus.last_plc_command_type
              ? `${
                  systemStatus.last_plc_command_type === "STOP"
                    ? "🛑 정지"
                    : "↻ 리셋"
                } ${
                  systemStatus.last_plc_command
                    ? format(
                        new Date(systemStatus.last_plc_command),
                        "HH:mm:ss"
                      )
                    : ""
                }`.trim()
              : "없음"}
          </p>
        </StatusItem>
      </div>
    </div>
  );
}
