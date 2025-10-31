"use client";

import React from "react";
import { PITCH_COLOR_MAP } from "@/lib/constants";

interface StroboFeedbackProps {
  pitchName: string;
  deviation: number; // -1.0 to 1.0
}

export const StroboFeedback: React.FC<StroboFeedbackProps> = ({
  pitchName,
  deviation,
}) => {
  const color = PITCH_COLOR_MAP[pitchName.replace(/\d+$/, "")] || "#000000";

  // ストロボのスクロール速度と方向を偏差から計算
  // 偏差が大きいほど速く動く
  const scrollSpeed = Math.abs(deviation) * 2 + 0.1; // 0.1-2.1秒で1周期
  const direction = deviation > 0 ? "strobeScrollRight" : "strobeScrollLeft";

  // 完璧なチューニングの時はスクロールを止める（ストロボ効果で静止して見える）
  const isInTune = Math.abs(deviation) < 0.05;

  // 縞模様のパターン数
  const stripeCount = 20;
  const stripeWidth = 40; // px

  return (
    <div className="flex items-center gap-3 w-full">
      {/* 音名ラベル */}
      <div className="text-sm font-medium text-muted-foreground min-w-12 text-center">
        {pitchName}
      </div>

      {/* 横長のストロボディスプレイ */}
      <div className="relative flex-1 h-16 border-2 border-gray-300 dark:border-gray-700 rounded overflow-hidden bg-gray-100 dark:bg-gray-900">
        {/* スクロールする縞模様 */}
        <div
          className="absolute inset-0 flex"
          style={{
            animation: isInTune
              ? "none"
              : `${direction} ${scrollSpeed}s linear infinite`,
          }}
        >
          {/* 縞模様を2セット並べて無限ループ効果 */}
          {Array.from({ length: 2 }).map((_, setIndex) => (
            <div
              key={setIndex}
              className="flex"
              style={{ minWidth: `${stripeCount * stripeWidth}px` }}
            >
              {Array.from({ length: stripeCount }).map((_, i) => (
                <div
                  key={i}
                  className="shrink-0"
                  style={{
                    width: `${stripeWidth}px`,
                    height: "100%",
                    backgroundColor: i % 2 === 0 ? color : "transparent",
                    opacity: i % 2 === 0 ? 0.7 : 1,
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* 中央の基準線 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-0.5 h-full bg-white/80 shadow-lg" />
        </div>
      </div>

      {/* 状態インジケーター */}
      <div className="min-w-20 text-xs text-center">
        {isInTune ? (
          <span className="text-green-600 dark:text-green-400 font-semibold">
            ✓ 合致
          </span>
        ) : (
          <span className="text-muted-foreground">
            {deviation > 0 ? "↑ 高い" : "↓ 低い"}
          </span>
        )}
      </div>
    </div>
  );
};
