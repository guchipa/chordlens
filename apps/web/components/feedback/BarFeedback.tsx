"use client";

import React, { useMemo } from "react";
import { getSingleEqualJustDiff } from "@chordlens/core/audio_analysis/calcJustFreq";
import {
  CHORD_ROLE_COLORS,
  FEEDBACK_NUMBER_UPDATE_MS,
  TUNING_LEVEL_COLORS,
} from "@chordlens/core/constants";
import { tuningLevel, type TuningLevel } from "@chordlens/core/feedback/tuningMetrics";
import { useStabilizedFeedback, useThrottledValue } from "@/lib/hooks/useStabilizedFeedback";
import type { Pitch } from "@chordlens/core/types";

interface BarFeedbackProps {
  pitchName: string;
  deviation: number | null; // -1.0 to 1.0, or null when not detected
  rootPitchName?: string; // 根音の音名（例: "C4"）
  a4Freq?: number; // A4の基準周波数（デフォルト: 442Hz）
  /**
   * enhanced 表示用 (BarListFeedback から渡す)。指定すると左に役割ラベルと
   * 平均律との差、右に偏差のセント値を出す
   */
  enhanced?: {
    roleLabel: string | null;
    roleColor: string;
    /** 数値表示用 (間引き後) の偏差のセント値と段階 */
    shownCents: number | null;
    shownLevel: TuningLevel | null;
    /** 純正律 − 平均律 (セント) */
    justOffsetCents: number | null;
  };
}

/** enhanced の行の高さ (役割ラベル + 音名 + 平均律との差の 3 行が収まる高さ)。空き行も同じ */
const BAR_ROW_HEIGHT = "h-[52px]";

function formatSignedCents(cents: number): string {
  const r = Math.round(cents);
  return r > 0 ? `+${r}` : r < 0 ? `−${Math.abs(r)}` : "±0";
}

export const BarFeedback: React.FC<BarFeedbackProps> = ({
  pitchName,
  deviation,
  rootPitchName,
  a4Freq = 442,
  enhanced,
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

  const shownLevel = enhanced?.shownLevel ?? null;

  return (
    <div
      // enhanced: 行の高さを固定し、根音 (平均律との差の行なし) と他の音、空き行で
      // 高さが揃わずに和音が変わるたびに行がずれるのを防ぐ
      className={enhanced ? `flex ${BAR_ROW_HEIGHT} w-full items-center gap-2` : "flex items-center gap-2 w-full"}
      data-testid="bar-row"
    >
      {enhanced ? (
        <div className="flex w-[4.5rem] shrink-0 flex-col items-end leading-tight">
          <span
            className="max-w-full truncate rounded-full px-1.5 text-[11px] font-semibold text-white"
            style={{ backgroundColor: enhanced.roleColor }}
          >
            {enhanced.roleLabel ?? "—"}
          </span>
          <span className="flex items-center gap-1 text-base font-semibold tabular-nums">
            {isInTune && (
              <span className="text-green-600" role="img" aria-label="合っています">
                ✓
              </span>
            )}
            {pitchName}
          </span>
          {/* 差がない (根音・完全8度) ときも行は確保して高さを揃える */}
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {enhanced.justOffsetCents !== null && Math.abs(enhanced.justOffsetCents) >= 0.5
              ? `平均律${formatSignedCents(enhanced.justOffsetCents)}c`
              : "\u00a0"}
          </span>
        </div>
      ) : (
      <div className="flex w-16 shrink-0 items-center justify-end gap-1 text-base font-semibold tabular-nums">
        {isInTune && (
          <span
            className="text-green-600 dark:text-green-400"
            role="img"
            aria-label="合っています"
          >
            ✓
          </span>
        )}
        <span>{pitchName}</span>
      </div>
      )}

      <div className="relative h-8 grow bg-gray-200 dark:bg-gray-800 rounded-md overflow-hidden">
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
              className="absolute top-1 bottom-1 rounded-sm transition-all duration-150"
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
            未検出
          </div>
        )}
      </div>
      {enhanced && (
        <span
          data-testid="bar-cents"
          className="w-12 shrink-0 text-right text-lg font-bold tabular-nums"
          style={{ color: shownLevel ? TUNING_LEVEL_COLORS[shownLevel] : "#9ca3af" }}
        >
          {enhanced.shownCents === null ? "—" : `${formatSignedCents(enhanced.shownCents)}c`}
        </span>
      )}
    </div>
  );
};

/** 構成音が 3↔4 で変わってもカードの高さが動かないよう、最低この行数を確保する */
const MIN_BAR_ROWS = 4;

interface BarListFeedbackProps {
  analysisData: Array<{ pitch: Pitch; deviation: number | null }>;
  evalRangeCents: number;
  a4Freq: number;
  holdEnabled: boolean;
}

/**
 * メイン画面用のバー一覧。構成音が動的に変わっても見失わないよう、
 * 上から高い声部の順 (楽譜と同じ向き) に並べ、役割ラベルを付け、最低 4 行を
 * 確保して行の位置とカードの高さを固定する。値は保持・平滑化 (和音変更でリセット) し、
 * セント値は間引いて表示する。
 */
export const BarListFeedback: React.FC<BarListFeedbackProps> = ({
  analysisData,
  evalRangeCents,
  a4Freq,
  holdEnabled,
}) => {
  const { voices, chordKey } = useStabilizedFeedback(analysisData, holdEnabled);
  const shown = useThrottledValue(
    voices.map((v) => v.deviation),
    FEEDBACK_NUMBER_UPDATE_MS,
    chordKey,
  );
  const rootPitchName = voices.find((v) => v.pitch.isRoot)?.key;
  const rows = voices.map((v, i) => ({ v, shownDeviation: shown[i] ?? null })).reverse();
  const emptyCount = Math.max(0, MIN_BAR_ROWS - rows.length);

  return (
    <div className="flex flex-col gap-2">
      {rows.map(({ v, shownDeviation }) => (
        <BarFeedback
          key={v.key}
          pitchName={v.key}
          deviation={v.deviation === null ? null : Math.max(-1, Math.min(1, v.deviation))}
          rootPitchName={rootPitchName}
          a4Freq={a4Freq}
          enhanced={{
            roleLabel: v.intervalLabel,
            roleColor: v.role ? CHORD_ROLE_COLORS[v.role] : "#9ca3af",
            shownCents: shownDeviation === null ? null : shownDeviation * evalRangeCents,
            shownLevel: shownDeviation === null ? null : tuningLevel(shownDeviation),
            justOffsetCents: v.justOffsetCents,
          }}
        />
      ))}
      {Array.from({ length: emptyCount }, (_, i) => (
        <div
          key={`empty-${i}`}
          aria-hidden="true"
          data-testid="bar-empty-row"
          className={`${BAR_ROW_HEIGHT} rounded-md border border-dashed border-gray-200`}
        />
      ))}
    </div>
  );
};
