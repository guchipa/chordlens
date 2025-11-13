"use client";

import React from "react";

interface NumericFeedbackProps {
  pitchName: string;
  deviation: number | null; // -1.0 to 1.0, or null when not detected
  evalRangeCents: number;
}

export const NumericFeedback: React.FC<NumericFeedbackProps> = ({
  pitchName,
  deviation,
  evalRangeCents,
}) => {
  // セント値に変換
  const centValue = deviation !== null ? deviation * evalRangeCents : null;

  // チューニング判定
  const isInTune = centValue !== null && Math.abs(centValue) < 5;

  return (
    <div className="flex flex-col items-center gap-4 p-6 border rounded-lg bg-card">
      <div className="text-base font-medium text-muted-foreground">
        {pitchName}
      </div>

      {centValue !== null ? (
        <>
          {/* 大きなセント表示 */}
          <div className="flex items-baseline gap-2 min-w-[280px] justify-center">
            <span
              className={`text-7xl font-bold tabular-nums transition-colors duration-300 ${isInTune
                ? "text-green-600 dark:text-green-400"
                : Math.abs(centValue) < 15
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-red-600 dark:text-red-400"
                }`}
            >
              {centValue > 0 ? "+" : ""}
              {centValue.toFixed(1)}
            </span>
            <span className="text-2xl text-muted-foreground">¢</span>
          </div>

          {/* 方向インジケーター */}
          <div className="flex items-center gap-4">
            <div
              className={`text-3xl transition-opacity ${centValue < -5 ? "opacity-100" : "opacity-20"
                }`}
            >
              ↓
            </div>
            <div
              className={`text-2xl font-semibold transition-opacity ${isInTune
                ? "opacity-100 text-green-600 dark:text-green-400"
                : "opacity-20"
                }`}
            >
              ✓
            </div>
            <div
              className={`text-3xl transition-opacity ${centValue > 5 ? "opacity-100" : "opacity-20"
                }`}
            >
              ↑
            </div>
          </div>

          <div className="text-sm text-center text-muted-foreground">
            {isInTune ? (
              <span className="text-green-600 dark:text-green-400 font-semibold">
                チューニング完了
              </span>
            ) : (
              <span>
                {Math.abs(centValue).toFixed(1)}¢ {centValue > 0 ? "高い" : "低い"}
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="min-w-[280px] h-[200px] flex items-center justify-center text-muted-foreground text-sm">
          音を検出していません
        </div>
      )}
    </div>
  );
};
