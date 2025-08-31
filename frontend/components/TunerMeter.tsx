"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { METER_MAX_DEVIATION_DEGREES, METER_REMAIN_MS } from "@/lib/constants";
import { formType } from "@/lib/schema";

// 各音名に対応する色のマップ
const PITCH_COLOR_MAP: { [key: string]: string } = {
  "C": "#ff6b6b",
  "C#": "#ff8e53",
  "D": "#ffc107",
  "E♭": "#fde047",
  "E": "#a8e063",
  "F": "#56ab2f",
  "F#": "#26de81",
  "G": "#2bcbba",
  "G#": "#45aaf2",
  "A": "#0fb9b1",
  "B♭": "#4a90e2",
  "B": "#8e44ad",
};

interface TunerMeterProps {
  /**
   * 解析結果の配列。各要素が1つの針に対応します。
   */
  analysisData: Array<{
    pitch: formType;
    deviation: number | null;
  }>;
  /** メーターのタイトル */
  title?: string;
}

export const TunerMeter: React.FC<TunerMeterProps> = ({
  analysisData,
  title,
}) => {
  // 表示用のデータを保持する state
  const [displayData, setDisplayData] = useState(analysisData);
  // タイマーのIDを保持するための ref
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 以前のタイマーが残っていればクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const isSoundDetected = analysisData.some((data) => data.deviation !== null);

    if (isSoundDetected) {
      // 音が検出されたら、すぐに表示を更新
      setDisplayData(analysisData);
    } else {
      // 音が検出されなかったら、1.5秒後に現在の analysisData（音が無い状態）で表示を更新するタイマーをセット
      // この間、displayData は古いままなので、針は表示され続ける
      timeoutRef.current = setTimeout(() => {
        setDisplayData(analysisData);
      }, METER_REMAIN_MS);
    }

    // コンポーネントがアンマウントされるときにタイマーをクリア
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [analysisData]); // analysisData が変更されるたびに effect を実行
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{title || "Tuner"}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col justify-center items-center">
        <div className="flex w-64 h-32 overflow-hidden mb-4">
          {/* メーターの背景（半円） */}
          <svg
            className="w-full h-full"
            viewBox="0 0 100 50"
          >
            <path d="M 0 50 A 50 50 0 0 1 100 50 L 0 50 Z" fill="#e0e0e0" />
            {/* 目盛り */}
            {[
              -METER_MAX_DEVIATION_DEGREES,
              -METER_MAX_DEVIATION_DEGREES / 2,
              0,
              METER_MAX_DEVIATION_DEGREES / 2,
              METER_MAX_DEVIATION_DEGREES,
            ].map((angle, idx) => {
              const rotationRad = (angle + 90) * (Math.PI / 180);
              const x1 = 50 + 40 * Math.cos(rotationRad);
              const y1 = 50 - 40 * Math.sin(rotationRad); // Y軸の向きを修正
              const x2 = 50 + 45 * Math.cos(rotationRad);
              const y2 = 50 - 45 * Math.sin(rotationRad); // Y軸の向きを修正
              return (
                <line
                  key={idx}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="black"
                  strokeWidth="1"
                />
              );
            })}

            {/* 各音に対応する針を描画 */}
            {displayData.map(({ pitch, deviation }, index) => {
              if (deviation === null) return null; // 検出されなかった音は表示しない

              const needleRotation =
                deviation * METER_MAX_DEVIATION_DEGREES;
              const needleColor =
                PITCH_COLOR_MAP[pitch.pitchName] || "#888"; // マップにない場合はデフォルト色

              return (
                <line
                  key={`${pitch.pitchName}-${pitch.octaveNum}-${index}`}
                  x1="50"
                  y1="50"
                  x2="50"
                  y2="10"
                  stroke={needleColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{
                    transformOrigin: "50px 50px",
                    transform: `rotate(${needleRotation}deg)`,
                    transition: "transform 0.2s ease-out",
                  }}
                />
              );
            })}
            <circle cx="50" cy="50" r="3" fill="black" />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
};
