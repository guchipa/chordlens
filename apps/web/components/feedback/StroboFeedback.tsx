import React from "react";
import { PITCH_COLOR_MAP } from "@chordlens/core/constants";

import styles from "./StroboFeedback.module.css";

interface StroboFeedbackProps {
  pitchName: string;
  deviation: number | null; // -1.0 to 1.0, or null when not detected
}

export const StroboFeedback: React.FC<StroboFeedbackProps> = ({
  pitchName,
  deviation,
}) => {
  const color = PITCH_COLOR_MAP[pitchName.replace(/\d+$/, "")] || "#000000";

  // ストロボのスクロール速度と方向を偏差から計算
  // 偏差が大きいほど速く動く
  const scrollSpeed = deviation !== null ? Math.abs(deviation) * 2 + 0.1 : 0; // 0.1-2.1秒で1周期
  const direction = deviation !== null && deviation > 0 ? "strobeScrollRight" : "strobeScrollLeft";

  // 完璧なチューニングの時はスクロールを止める（ストロボ効果で静止して見える）
  const isInTune = deviation !== null && Math.abs(deviation) < 0.05;

  // 縞模様のパターン数
  const stripeCount = 20;
  const stripeWidth = 40; // px

  return (
    <div className={styles.container}>
      {/* 音名ラベル */}
      <div className={styles.pitchLabel}>
        {pitchName}
      </div>

      {/* 横長のストロボディスプレイ */}
      <div className={styles.display}>
        {deviation !== null ? (
          <>
            {/* スクロールする縞模様 */}
            <div
              className={styles.stripes}
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
                  className={styles.stripeSet}
                  style={{ minWidth: `${stripeCount * stripeWidth}px` }}
                >
                  {Array.from({ length: stripeCount }).map((_, i) => (
                    <div
                      key={i}
                      className={styles.stripe}
                      style={{
                        width: `${stripeWidth}px`,
                        backgroundColor: i % 2 === 0 ? color : "transparent",
                        opacity: i % 2 === 0 ? 0.7 : 1,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* 中央の基準線 */}
            <div className={styles.centerLine}>
              <div className={styles.centerLineBar} />
            </div>
          </>
        ) : (
          <div className={styles.emptyMessage}>
            音を検出していません
          </div>
        )}
      </div>

      {/* 状態インジケーター */}
      <div className={styles.status}>
        {deviation === null ? (
          <span className={styles.statusMuted}>--</span>
        ) : isInTune ? (
          <span className={styles.statusInTune}>
            ✓ 合致
          </span>
        ) : (
          <span className={styles.statusMuted}>
            {deviation > 0 ? "↑ 高い" : "↓ 低い"}
          </span>
        )}
      </div>
    </div>
  );
};
