"use client";

import {
  CIRCLE_OF_FIFTHS,
  CLOSE_DEVIATION,
  IN_TUNE_DEVIATION,
  PITCH_NAME_LIST,
  TUNING_LEVEL_COLORS,
  type CircleLayout,
} from '@chordlens/core/constants';
import React from 'react';
import { useAtomValue } from 'jotai';
import { nameChord } from '@chordlens/core/feedback/chordName';
import type { Pitch } from '@chordlens/core/types';
import { useStabilizedFeedback } from '@/lib/hooks/useStabilizedFeedback';
import { circleLayoutAtom } from '@/lib/store';

interface CircleFeedbackProps {
  analysisData: Array<{
    pitchName: string;
    deviation: number | null;
  }>;
  className?: string;
  /** 音名の並び順 (既定: 半音順) */
  layout?: CircleLayout;
  /**
   * legacy: 従来の描画 (赤/緑の 2 値、針は ±15° の線形。評価実験画面用)
   * enhanced: メイン画面用。偏差に応じて塗りの色を連続的に変え、小さなずれでも
   *   針が見えるよう振れを平方根で拡大し、中央に centerLabel (和音名) を出す
   */
  variant?: 'legacy' | 'enhanced';
  centerLabel?: string | null;
  /** enhanced の塗り色で「合っている」とみなす閾値 (±1 正規化) */
  inTuneDeviation?: number;
}

/** enhanced の塗り色: 合っている=緑、近い=緑→黄、それ以上=黄→赤 (|偏差| 0.5 で赤) */
function continuousColor(deviation: number, inTune: number): string {
  const abs = Math.abs(deviation);
  if (abs < inTune) return TUNING_LEVEL_COLORS.inTune;
  const hue =
    abs <= CLOSE_DEVIATION
      ? 142 - (142 - 48) * ((abs - inTune) / Math.max(1e-9, CLOSE_DEVIATION - inTune))
      : Math.max(0, 48 - 48 * ((abs - CLOSE_DEVIATION) / (0.5 - CLOSE_DEVIATION)));
  return `hsl(${hue.toFixed(0)} 75% 50%)`;
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

export const CircleFeedback: React.FC<CircleFeedbackProps> = ({
  analysisData,
  className,
  layout = 'chromatic',
  variant = 'legacy',
  centerLabel,
  inTuneDeviation = IN_TUNE_DEVIATION,
}) => {
  const enhanced = variant === 'enhanced';
  const order = layout === 'fifths' ? CIRCLE_OF_FIFTHS : PITCH_NAME_LIST;
  const centerX = 300;
  const centerY = 300;
  const innerRadius = 80;
  const outerRadius = 150;
  const textRadius = 115;

  // 各音名の位置を計算
  const pitchPositions = order.map((name, index) => {
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
      const pitchIndex = order.indexOf(pitchNameOnly);

      if (pitchIndex === -1) return null;

      // 領域の中心角度（各音名は30度ずつ、Cが0度＝上）
      const centerAngle = pitchIndex * 30;

      // deviationに応じて角度を調整
      // deviation = -1 → 領域の開始角度（-15度）
      // deviation = 0 → 領域の中心角度（0度）
      // deviation = +1 → 領域の終了角度（+15度）
      // enhanced は平方根で拡大して小さなずれも見えるようにする (±1 で ±15度は同じ)
      const d = Math.max(-1, Math.min(1, data.deviation ?? 0));
      const angleOffset = enhanced
        ? Math.sign(d) * Math.sqrt(Math.abs(d)) * 15
        : (data.deviation ?? 0) * 15; // ±15度
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
      viewBox="144 144 312 312"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: '100%', height: 'auto' }}
      role="img"
      aria-label="音名ごとのずれを示す円形メーター"
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
        {order.map((name, index) => {
          const startAngle = index * 30 - 15;
          const endAngle = (index + 1) * 30 - 15;

          // この音名に対応するdeviationがあるか確認
          const deviation = deviationMap.get(name);

          if (deviation !== undefined) {
            // チューニングが合っているかどうか
            const isInTune = Math.abs(deviation) < 0.05;

            // 塗りつぶし色を決定（領域全体を塗りつぶす）
            const fillColor = enhanced
              ? continuousColor(deviation, inTuneDeviation)
              : isInTune ? '#22c55e' : '#ef4444'; // 緑 or 赤

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

        {enhanced && centerLabel && (
          <text
            data-testid="circle-center-label"
            x={centerX}
            y={centerY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={centerLabel.length > 5 ? 22 : 36}
            fontWeight="bold"
            fill="#111827"
          >
            {centerLabel}
          </text>
        )}

        {/* 音名のテキスト */}
        {pitchPositions.map((pos) => (
          <text
            key={pos.name}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="22"
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

/**
 * メイン画面用のサークル。並び順は設定 (circleLayoutAtom) に従い、値は
 * 保持・平滑化 (和音変更でリセット) し、中央に和音名を出す。
 */
export const CircleSlide: React.FC<{
  analysisData: Array<{ pitch: Pitch; deviation: number | null }>;
  holdEnabled: boolean;
  inTuneDeviation?: number;
  smoothingMs?: number;
  className?: string;
}> = ({ analysisData, holdEnabled, inTuneDeviation, smoothingMs = 0, className }) => {
  const layout = useAtomValue(circleLayoutAtom);
  const { voices } = useStabilizedFeedback(analysisData, holdEnabled, smoothingMs);
  const chord = nameChord(analysisData.map((d) => d.pitch));
  return (
    <CircleFeedback
      analysisData={voices.map((v) => ({ pitchName: v.key, deviation: v.deviation }))}
      layout={layout}
      variant="enhanced"
      centerLabel={chord?.symbol ?? chord?.rootName ?? null}
      inTuneDeviation={inTuneDeviation}
      className={className}
    />
  );
};

export default CircleFeedback;