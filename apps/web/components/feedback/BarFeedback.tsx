import React, { useMemo } from "react";
import { getSingleEqualJustDiff } from "@chordlens/core/audio_analysis/calcJustFreq";

import styles from "./BarFeedback.module.css";

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
    <div className={styles.container}>
      <div className={styles.pitchLabel}>
        {pitchName}
      </div>

      <div className={styles.track}>
        {/* 中央ライン */}
        <div className={styles.centerLine} />

        {/* 許容範囲の表示 */}
        <div
          className={styles.toleranceRange}
        />

        {/* 平均律の位置を示す目印 */}
        {etPercentage !== null && (
          <div
            className={styles.equalMarker}
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
              className={styles.bar}
              style={{
                backgroundColor: isInTune
                  ? "var(--ion-color-success)"
                  : isClose
                    ? "var(--ion-color-warning)"
                    : "var(--ion-color-danger)",
                left: percentage > 0 ? "50%" : `${50 + percentage}%`,
                width: `${Math.abs(percentage)}%`,
              }}
            />

            {/* インジケーター */}
            <div
              className={styles.indicator}
              style={{
                left: `${50 + percentage}%`,
              }}
            />
          </>
        )}

        {deviation === null && (
          <div className={styles.emptyMessage}>
            音を検出していません
          </div>
        )}
      </div>

      <div className={styles.statusRow}>
        <span>低い</span>
        <span
          className={isInTune ? styles.inTune : undefined}
        >
          {deviation === null ? "--" : isInTune ? "✓" : "調整中"}
        </span>
        <span>高い</span>
      </div>
    </div>
  );
};
