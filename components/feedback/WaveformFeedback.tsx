"use client";

import React, { useEffect, useRef } from "react";
import { PITCH_COLOR_MAP } from "@/lib/constants";

interface WaveformFeedbackProps {
  pitchName: string;
  deviation: number; // -1.0 to 1.0
}

export const WaveformFeedback: React.FC<WaveformFeedbackProps> = ({
  pitchName,
  deviation,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const color = PITCH_COLOR_MAP[pitchName.replace(/\d+$/, "")] || "#000000";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // クリア
    ctx.clearRect(0, 0, width, height);

    // 背景グリッド
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;

    // 水平線
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (height / 4) * i);
      ctx.lineTo(width, (height / 4) * i);
      ctx.stroke();
    }

    // 中央線（目標）
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // 波形描画
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();

    const amplitude = deviation * (height / 4);
    const frequency = 0.05;

    for (let x = 0; x < width; x++) {
      const y = height / 2 + amplitude * Math.sin(x * frequency);
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }, [deviation, color]);

  const isInTune = Math.abs(deviation) < 0.05;

  return (
    <div className="flex flex-col gap-2 p-4 w-full border rounded-lg bg-card">
      <div className="text-sm font-medium text-center text-muted-foreground">
        {pitchName}
      </div>

      <canvas
        ref={canvasRef}
        width={400}
        height={120}
        className="w-full h-auto border border-gray-300 dark:border-gray-700 rounded-lg"
      />

      <div className="text-xs text-center">
        {isInTune ? (
          <span className="text-green-600 dark:text-green-400 font-semibold">
            ✓ チューニング完了
          </span>
        ) : (
          <span className="text-muted-foreground">
            {deviation > 0 ? "高い" : "低い"} (
            {Math.abs(deviation * 100).toFixed(1)}%)
          </span>
        )}
      </div>
    </div>
  );
};
