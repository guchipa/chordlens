"use client";

import { PITCH_NAME_LIST } from '@/lib/constants';
import React from 'react';

interface CircleFeedbackProps {
  analysisData: Array<{
    pitchName: string;
    deviation: number | null;
  }>;
  className?: string;
}

// SVGの円弧パスを生成する関数
// 内側の半径から外側の半径まで、指定した角度範囲の扇形を描く
const createArcPath = (
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string => {
  const startRad = (startAngle - 90) * (Math.PI / 180);
  const endRad = (endAngle - 90) * (Math.PI / 180);

  const x1 = centerX + innerRadius * Math.cos(startRad);
  const y1 = centerY + innerRadius * Math.sin(startRad);
  const x2 = centerX + outerRadius * Math.cos(startRad);
  const y2 = centerY + outerRadius * Math.sin(startRad);
  const x3 = centerX + outerRadius * Math.cos(endRad);
  const y3 = centerY + outerRadius * Math.sin(endRad);
  const x4 = centerX + innerRadius * Math.cos(endRad);
  const y4 = centerY + innerRadius * Math.sin(endRad);

  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return `
    M ${x1} ${y1}
    L ${x2} ${y2}
    A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3}
    L ${x4} ${y4}
    A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}
    Z
  `;
};

export const CircleFeedback: React.FC<CircleFeedbackProps> = ({ analysisData, className }) => {
  const centerX = 300;
  const centerY = 300;
  const innerRadius = 80;
  const outerRadius = 150;
  const textRadius = 115;

  // 各音名の位置を計算
  const pitchPositions = PITCH_NAME_LIST.map((name, index) => {
    const angle = (index * 30 - 90) * (Math.PI / 180);
    const x = centerX + textRadius * Math.cos(angle);
    const y = centerY + textRadius * Math.sin(angle);
    return { name, x, y };
  });

  // analysisDataから音名ごとのdeviationマップを作成
  const deviationMap = new Map<string, number>();
  analysisData.forEach((data) => {
    if (data.deviation !== null) {
      // オクターブ番号を除いた音名のみを使用
      const pitchNameOnly = data.pitchName.replace(/[0-9]/g, '');
      deviationMap.set(pitchNameOnly, data.deviation);
    }
  });

  // 針の角度を計算（構成音ごとに1本）
  const needles = analysisData
    .filter((data) => data.deviation !== null)
    .map((data) => {
      const pitchNameOnly = data.pitchName.replace(/[0-9]/g, '');
      const pitchIndex = PITCH_NAME_LIST.indexOf(pitchNameOnly);

      if (pitchIndex === -1) return null;

      // 領域の中心角度（各音名は30度ずつ、Cが0度＝上）
      const centerAngle = pitchIndex * 30;

      // deviationに応じて角度を調整
      // deviation = -1 → 領域の開始角度（-15度）
      // deviation = 0 → 領域の中心角度（0度）
      // deviation = +1 → 領域の終了角度（+15度）
      const angleOffset = (data.deviation ?? 0) * 15; // ±15度
      const needleAngle = centerAngle + angleOffset;

      return {
        angle: needleAngle,
        pitchName: pitchNameOnly,
        deviation: data.deviation ?? 0,
      };
    })
    .filter((needle) => needle !== null);

  return (
    <svg
      viewBox="0 0 600 600"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: '100%', height: 'auto' }}
    >
      <g className="layer" display="inline">
        {/* 背景の外側の円 */}
        <ellipse
          cx={centerX}
          cy={centerY}
          fill="#f0f0f0"
          rx={outerRadius}
          ry={outerRadius}
          stroke="#000000"
          strokeWidth="5"
        />

        {/* 12個の領域それぞれを塗りつぶし */}
        {PITCH_NAME_LIST.map((name, index) => {
          const startAngle = index * 30 - 15;
          const endAngle = (index + 1) * 30 - 15;

          // この音名に対応するdeviationがあるか確認
          const deviation = deviationMap.get(name);

          if (deviation !== undefined) {
            // チューニングが合っているかどうか
            const isInTune = Math.abs(deviation) < 0.05;

            // 塗りつぶし色を決定（領域全体を塗りつぶす）
            const fillColor = isInTune ? '#22c55e' : '#ef4444'; // 緑 or 赤

            return (
              <path
                key={`fill-${name}`}
                d={createArcPath(centerX, centerY, innerRadius, outerRadius, startAngle, endAngle)}
                fill={fillColor}
                opacity={0.8}
              />
            );
          }
          return null;
        })}

        {/* 放射状の線 (12本、30度ずつ) */}
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={`line-${i}`}
            fill="none"
            stroke="#000000"
            strokeWidth="3"
            transform={`rotate(${i * 30 - 15} ${centerX} ${centerY})`}
            x1={centerX}
            x2={centerX}
            y1={centerY - outerRadius}
            y2={centerY + outerRadius}
          />
        ))}

        {/* 針（構成音ごとに1本、deviationに応じて角度を変える） */}
        {needles.map((needle, i) => {
          if (!needle) return null;

          // 針の角度（-90度でSVGの座標系に合わせる）
          const angleRad = (needle.angle - 90) * (Math.PI / 180);

          // 針の終点座標
          const x2 = centerX + outerRadius * Math.cos(angleRad);
          const y2 = centerY + outerRadius * Math.sin(angleRad);

          return (
            <line
              key={`needle-${i}`}
              x1={centerX}
              y1={centerY}
              x2={x2}
              y2={y2}
              stroke="#000000"
              strokeWidth="4"
              strokeLinecap="round"
            />
          );
        })}

        {/* 内側の円 */}
        <ellipse
          cx={centerX}
          cy={centerY}
          fill="#ffffff"
          rx={innerRadius}
          ry={innerRadius}
          stroke="#000000"
          strokeWidth="5"
        />

        {/* 音名のテキスト */}
        {pitchPositions.map((pos) => (
          <text
            key={pos.name}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="20"
            fontWeight="bold"
            fill="#000000"
          >
            {pos.name}
          </text>
        ))}
      </g>
    </svg>
  );
};

export default CircleFeedback;