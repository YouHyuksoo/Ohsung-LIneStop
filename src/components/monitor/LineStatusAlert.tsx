/**
 * @file components/monitor/LineStatusAlert.tsx
 * @description
 * 라인 정지/운영 상태를 시각적으로 표시하는 알림 컴포넌트.
 * 라인이 정지되었을 때는 빨간색으로, 정상 운영 중일 때는 초록색으로 표시됩니다.
 *
 * 주요 기능:
 * - 라인 상태에 따른 색상 변경 (정지: 빨강, 운영: 초록)
 * - 정지 사유 표시
 * - 임계값을 초과한 불량 유형 표시 (배지 형태)
 * - 정지 시 애니메이션 효과 (pulse)
 *
 * 사용 예시:
 * ```tsx
 * <LineStatusAlert
 *   lineStatus="STOPPED"
 *   stopReason="외관불량 임계값 초과"
 *   violatedTypes={["APPEARANCE"]}
 * />
 * ```
 */

import { AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFECT_TYPE_CONFIG = {
  APPEARANCE: { label: "외관불량", color: "bg-blue-500" },
  FUNCTION: { label: "기능불량", color: "bg-purple-500" },
  COMMON_SENSE: { label: "상식이하", color: "bg-red-500" },
  PL: { label: "작업자안전", color: "bg-yellow-500" },
};

type DefectType = keyof typeof DEFECT_TYPE_CONFIG;

interface LineStatusAlertProps {
  lineStatus: "RUNNING" | "STOPPED";
  stopReason: string;
  violatedTypes: DefectType[];
}

export default function LineStatusAlert({
  lineStatus,
  stopReason,
  violatedTypes,
}: LineStatusAlertProps) {
  const isStopped = lineStatus === "STOPPED";

  return (
    <div
      className={cn(
        "mb-8 border-2 rounded-xl p-6 shadow-lg transition-all duration-300",
        isStopped
          ? "bg-red-900/20 border-red-500"
          : "bg-green-900/20 border-green-500"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-4">
          {isStopped ? (
            <AlertTriangle className="w-10 h-10 text-red-400 flex-shrink-0 mt-1 animate-pulse" />
          ) : (
            <CheckCircle className="w-10 h-10 text-green-400 flex-shrink-0 mt-1" />
          )}
          <div className="flex-1">
            <h3
              className={cn(
                "text-2xl font-bold mb-2",
                isStopped ? "text-red-400" : "text-green-400"
              )}
            >
              {isStopped ? "⚠️ 라인 정지 신호 발송" : "✅ 정상 운영 중"}
            </h3>
            <p
              className={cn(
                "text-lg",
                isStopped ? "text-red-300" : "text-green-300"
              )}
            >
              {isStopped
                ? stopReason
                : "모든 불량 항목이 정상 범위 내에 있습니다."}
            </p>
            {isStopped && violatedTypes.length > 0 && (
              <div className="flex items-center gap-2 mt-3 text-sm">
                <span className="text-red-300 font-semibold">임계값 초과:</span>
                <div className="flex gap-2">
                  {violatedTypes.map((type) => {
                    const typeConfig = DEFECT_TYPE_CONFIG[type];
                    return (
                      <span
                        key={type}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold text-white",
                          typeConfig.color
                        )}
                      >
                        {typeConfig.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
