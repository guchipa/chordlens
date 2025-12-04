"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { METER_MAX_DEVIATION_DEGREES, METER_REMAIN_MS, PITCH_COLOR_MAP } from "@/lib/constants";
import { formType } from "@/lib/schema";
import { getSingleEqualJustDiff } from "@/lib/audio_analysis/calcJustFreq";

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
  /** 根音の音名（例: "C4"） */
  rootPitchName?: string;
  /** A4の基準周波数（デフォルト: 442Hz） */
  a4Freq?: number;
}

export const TunerMeter: React.FC<TunerMeterProps> = ({
  analysisData,
  title,
  rootPitchName,
  a4Freq = 442,
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

            {/* 平均律マーカー */}
            {rootPitchName && displayData?.map(({ pitch }, index) => {
              const pitchName = `${pitch.pitchName}${pitch.octaveNum}`;
              const equalJustDiffCents = getSingleEqualJustDiff(pitchName, rootPitchName, a4Freq);

              if (equalJustDiffCents === null) return null;

              // セントを-1.0〜1.0の範囲に正規化（±50セントが±1.0に対応）
              const normalizedDiff = equalJustDiffCents / 50;
              const markerRotation = normalizedDiff * METER_MAX_DEVIATION_DEGREES;
              const markerColor = PITCH_COLOR_MAP[pitch.pitchName] || "#888";

              // マーカー用の座標計算
              const markerRotationRad = (-markerRotation + 90) * (Math.PI / 180);
              const x1 = 50 + 35 * Math.cos(markerRotationRad);
              const y1 = 50 - 35 * Math.sin(markerRotationRad);
              const x2 = 50 + 45 * Math.cos(markerRotationRad);
              const y2 = 50 - 45 * Math.sin(markerRotationRad);

              return (
                <line
                  key={`marker-${pitch.pitchName}-${pitch.octaveNum}-${index}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={markerColor}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              );
            })}

            {/* 各音に対応する針を描画 */}
            {displayData?.map(({ pitch, deviation }, index) => {
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
        <div className="flex flex-wrap justify-start gap-x-4 gap-y-2 mt-4">
          {displayData.map(({ pitch: { pitchName, octaveNum } }, index) => (
            <div
              key={`${pitchName}-${octaveNum}-${index}`}
              className="flex items-center gap-2 text-sm"
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: PITCH_COLOR_MAP[pitchName] || "#888",
                }}
              />
              <span className="font-semibold">
                {pitchName}
                {octaveNum}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
