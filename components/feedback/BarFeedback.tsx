"use client";

import React, { useMemo } from "react";
import { getSingleEqualJustDiff } from "@/lib/audio_analysis/calcJustFreq";

interface BarFeedbackProps {
  pitchName: string;
  deviation: number | null; // -1.0 to 1.0, or null when not detected
  rootPitchName?: string; // 根音の音名（例: "C4"）
  a4Freq?: number; // A4の基準周波数（デフォルト: 442Hz）
}

export const BarFeedback: React.FC<BarFeedbackProps> = ({
  pitchName,
  deviation,
  rootPitchName,
  a4Freq = 442,
}) => {
  // 平均律と純正律の差を計算（セント単位）
  const equalJustDiffCents = useMemo(() => {
    if (!rootPitchName) return null;
    return getSingleEqualJustDiff(pitchName, rootPitchName, a4Freq);
  }, [pitchName, rootPitchName, a4Freq]);

  // 偏差をパーセンテージに変換（中央が0%）
  const percentage = deviation !== null ? deviation * 50 : 0; // -50% to 50%

  // 平均律の位置（セントを-1.0〜1.0の範囲に正規化してパーセンテージに変換）
  // ±50セント（EVAL_RANGE_CENTS）が±1.0に対応
  const etPercentage = equalJustDiffCents !== null
    ? (equalJustDiffCents / 50) * 50 // セント → -1.0〜1.0 → パーセンテージ
    : null;

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

        {/* 平均律の位置を示す目印 */}
        {etPercentage !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-blue-500 dark:bg-blue-400 z-10"
            style={{
              left: `${50 + etPercentage}%`,
            }}
            title="平均律"
          />
        )}

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
