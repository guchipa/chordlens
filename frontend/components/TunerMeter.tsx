'use client';

import React from 'react';
import { cn } from "@/lib/utils"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// constants.ts からメーター描画に関する定数をインポート (必要に応じて追加)
import { METER_MAX_DEVIATION_DEGREES } from '@/lib/constants';

interface TunerMeterProps {
  /**
   * 音程の評価結果（-1.0 から 1.0 の範囲の数値、または null）。
   * 0.0 が中央（純正律に一致）、負の値は低い、正の値は高いことを示す。
   * eval 関数の結果のリストのうち、主要な音（例：根音）の評価値を用いる。
   */
  deviation: number | null;
  /** 評価対象の音名 */
  pitchName: string;
  /** メーターに表示するメッセージ */
  message?: string;
}

export const TunerMeter: React.FC<TunerMeterProps> = ({ deviation, pitchName }) => {
  console.log(deviation);
  // 偏差 (deviation) を針の角度に変換
  // deviation は -1.0 から 1.0 の範囲を想定
  // -1.0 で -METER_MAX_DEVIATION_DEGREES 度、1.0 で +METER_MAX_DEVIATION_DEGREES 度
  const needleRotation = deviation !== null
    ? deviation * METER_MAX_DEVIATION_DEGREES
    : 0; // 検出なしの場合は中央（0度）に設定

  // 針の色を偏差に応じて変更 (例: 緑 - 黄 - 赤)
  const needleColor = deviation !== null
    ? Math.abs(deviation) < 0.1 ? 'green' // 許容範囲内
      : Math.abs(deviation) < 0.3 ? 'orange' // ややずれている
        : 'red' // 大きくずれている
    : 'gray'; // 検出なし

  return (
    <Card className="w-96 mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-3xl">
          {pitchName || "---"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center p-6">
        <div className="relative w-48 h-24 overflow-hidden mb-4">
          {/* メーターの背景（半円） */}
          <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 50">
            <path
              d="M 0 50 A 50 50 0 0 1 100 50 L 0 50 Z" // 半円
              fill="#e0e0e0" // 明るいグレー
            />
            {/* 目盛り (簡略化された例) */}
            {[-METER_MAX_DEVIATION_DEGREES, -METER_MAX_DEVIATION_DEGREES / 2, 0, METER_MAX_DEVIATION_DEGREES / 2, METER_MAX_DEVIATION_DEGREES].map((angle, idx) => {
              const rotationRad = (angle + 90) * (Math.PI / 180); // SVGの座標系に合わせるための調整
              const x1 = 50 + 40 * Math.cos(rotationRad);
              const y1 = 50 + 40 * Math.sin(rotationRad);
              const x2 = 50 + 45 * Math.cos(rotationRad);
              const y2 = 50 + 45 * Math.sin(rotationRad);
              return <line key={idx} x1={x1} y1={y1} x2={x2} y2={y2} stroke="black" strokeWidth="1" />;
            })}

            {/* 針 */}
            <line
              x1="50" y1="50" // 中心
              x2="50" y2="10" // 針の先端（デフォルトは上向き）
              stroke={needleColor}
              strokeWidth="2"
              strokeLinecap="round"
              style={{
                transformOrigin: '50px 50px', // SVGの中心を回転軸に設定
                transform: `rotate(${needleRotation}deg)`, // 計算された角度で回転
                transition: 'transform 0.1s ease-out, stroke 0.1s ease-out', // 滑らかなアニメーション
              }}
            />
            {/* 中心点 */}
            <circle cx="50" cy="50" r="2" fill="black" />
          </svg>
        </div>
        <p className="text-xl font-semibold text-center mt-2">
          {deviation !== null ? (
            `${deviation >= 0 ? '+' : ''}${(deviation * 100).toFixed(2)}%`
          ) : (
            '--.--%'
          )}
        </p>
        <p className={cn("text-lg", {
          "text-green-600": needleColor === 'green',
          "text-orange-500": needleColor === 'orange',
          "text-red-600": needleColor === 'red',
          "text-gray-500": needleColor === 'gray',
        })}>
          {deviation !== null ? (Math.abs(deviation) < 0.1 ? 'In Tune' : 'Out of Tune') : 'No Sound'}
        </p>
      </CardContent>
    </Card>
  );
};