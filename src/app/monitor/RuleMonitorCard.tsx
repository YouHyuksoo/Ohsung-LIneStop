import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Rule {
  code: string;
  name: string;
  threshold: number;
}

interface Defect {
  id: string;
  code: string;
  name: string;
  timestamp: string;
}

interface RuleMonitorCardProps {
  rule: Rule;
  count: number;
  recentDefect?: Defect;
}

export default function RuleMonitorCard({
  rule,
  count,
  recentDefect,
}: RuleMonitorCardProps) {
  const isDetected = count > 0;

  const baseStyle = {
    bgColor: "bg-blue-950/20",
    borderColor: "border-blue-800",
    textColor: "text-blue-200",
    countColor: "text-blue-100",
    animation: "",
  };

  const detectedStyle = {
    bgColor: "bg-red-950/30",
    borderColor: "border-red-500",
    textColor: "text-red-400",
    countColor: "text-red-500",
    animation: "animate-pulse",
  };

  const style = isDetected ? detectedStyle : baseStyle;

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-8 transition-all duration-300 min-h-[280px] flex flex-col",
        style.bgColor,
        style.borderColor,
        style.animation
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={cn("text-2xl font-bold mb-2", style.textColor)}>
            {rule.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            기준: {rule.threshold}회
          </p>
        </div>
        <div className={cn("text-6xl font-black", style.countColor)}>
          {count}
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-gray-700">
        <p className="text-xs text-muted-foreground mb-2">
          최근 불량 (DB 폴링)
        </p>
        {recentDefect ? (
          <div className="text-xs flex items-center justify-between bg-gray-800/50 rounded px-2 py-1">
            <span className="text-gray-300 truncate">{recentDefect.name}</span>
            <span className="text-gray-500 ml-2">
              {format(new Date(recentDefect.timestamp), "HH:mm:ss")}
            </span>
          </div>
        ) : (
          <p className="text-xs text-gray-500">불량 없음</p>
        )}
      </div>
    </div>
  );
}
