import React from "react";

import styles from "./NumericFeedback.module.css";

interface NumericFeedbackProps {
  pitchName: string;
  deviation: number | null; // -1.0 to 1.0, or null when not detected
  evalRangeCents: number;
}

export const NumericFeedback: React.FC<NumericFeedbackProps> = ({
  pitchName,
  deviation,
  evalRangeCents,
}) => {
  // セント値に変換
  const centValue = deviation !== null ? deviation * evalRangeCents : null;

  // チューニング判定
  const isInTune = centValue !== null && Math.abs(centValue) < 5;

  return (
    <div className={styles.container}>
      <div className={styles.pitchLabel}>
        {pitchName}
      </div>

      {centValue !== null ? (
        <>
          {/* 大きなセント表示 */}
          <div className={styles.centRow}>
            <span
              className={`${styles.centValue} ${isInTune
                ? styles.centValueInTune
                : Math.abs(centValue) < 15
                  ? styles.centValueClose
                  : styles.centValueFar
                }`}
            >
              {centValue > 0 ? "+" : ""}
              {centValue.toFixed(1)}
            </span>
            <span className={styles.centUnit}>¢</span>
          </div>

          {/* 方向インジケーター */}
          <div className={styles.directionRow}>
            <div
              className={`${styles.directionIcon} ${centValue < -5 ? styles.directionIconActive : ""
                }`}
            >
              ↓
            </div>
            <div
              className={`${styles.checkIcon} ${isInTune ? styles.checkIconActive : ""
                }`}
            >
              ✓
            </div>
            <div
              className={`${styles.directionIcon} ${centValue > 5 ? styles.directionIconActive : ""
                }`}
            >
              ↑
            </div>
          </div>

          <div className={styles.statusText}>
            {isInTune ? (
              <span className={styles.statusTextInTune}>
                チューニング完了
              </span>
            ) : (
              <span>
                {Math.abs(centValue).toFixed(1)}¢ {centValue > 0 ? "高い" : "低い"}
              </span>
            )}
          </div>
        </>
      ) : (
        <div className={styles.emptyMessage}>
          音を検出していません
        </div>
      )}
    </div>
  );
};
