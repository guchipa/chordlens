"use client";

import React from "react";

interface BarFeedbackProps {
  pitchName: string;
  deviation: number | null; // -1.0 to 1.0, or null when not detected
}

export const BarFeedback: React.FC<BarFeedbackProps> = ({
  pitchName,
  deviation,
}) => {
  // 偏差をパーセンテージに変換（中央が0%）
  const percentage = deviation !== null ? deviation * 50 : 0; // -50% to 50%

  // チューニング判定
  const isInTune = deviation !== null && Math.abs(deviation) < 0.05;
  const isClose = deviation !== null && Math.abs(deviation) < 0.2;

  return (
    <div className="flex flex-col gap-2 p-4 w-full border rounded-lg bg-card">
      <div className="text-sm font-medium text-center text-muted-foreground">
        {pitchName}
      </div>

      <div className="relative h-12 w-full bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden">
        {/* 中央ライン */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-400 dark:bg-gray-600 z-10" />

        {/* 許容範囲の表示 */}
        <div
          className="absolute top-0 bottom-0 bg-green-100 dark:bg-green-900/30"
          style={{
            left: "45%",
            width: "10%",
          }}
        />

        {deviation !== null && (
          <>
            {/* バー */}
            <div
              className="absolute top-1 bottom-1 rounded transition-all duration-150"
              style={{
                backgroundColor: isInTune
                  ? "#22c55e"
                  : isClose
                    ? "#eab308"
                    : "#ef4444",
                left: percentage > 0 ? "50%" : `${50 + percentage}%`,
                width: `${Math.abs(percentage)}%`,
                maxWidth: "50%",
              }}
            />

            {/* インジケーター */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-gray-700 dark:bg-gray-300 transition-all duration-150 z-20"
              style={{
                left: `${50 + percentage}%`,
              }}
            />
          </>
        )}

        {deviation === null && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            音を検出していません
          </div>
        )}
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>低い</span>
        <span
          className={
            isInTune ? "text-green-600 dark:text-green-400 font-semibold" : ""
          }
        >
          {deviation === null ? "--" : isInTune ? "✓" : "調整中"}
        </span>
        <span>高い</span>
      </div>
    </div>
  );
};
