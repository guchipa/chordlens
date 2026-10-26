"use client";

import React from "react";
import type { Pitch } from "@chordlens/core/types";
import { TunerMeter } from "./MeterFeedback";

interface UnifiedFeedbackProps {
  analysisData: Array<{
    pitch: Pitch;
    deviation: number | null;
  }>;
  a4Freq?: number;
  /** 表示保持（ホールド）を有効にするか */
  holdEnabled?: boolean;
}

/**
 * 評価実験画面 (/experiments) 用のフィードバック表示。
 * 被験者条件を変えないため、形式は従来のメーター (legacy 描画) に固定し、
 * 切替 UI は置かない (メイン画面の形式の選択にも影響されない)。
 * メイン画面は FeedbackCarousel を使う。
 */
export const UnifiedFeedback: React.FC<UnifiedFeedbackProps> = ({
  analysisData,
  a4Freq = 442,
  holdEnabled = true,
}) => {
  const rootPitch = analysisData.find((data) => data.pitch.isRoot);
  const rootPitchName = rootPitch
    ? `${rootPitch.pitch.pitchName}${rootPitch.pitch.octaveNum}`
    : undefined;

  return (
    <div className="mx-auto w-full max-w-md">
      <TunerMeter
        hideHeader
        analysisData={analysisData.filter((data) => data.pitch.enabled === true)}
        rootPitchName={rootPitchName}
        a4Freq={a4Freq}
        holdEnabled={holdEnabled}
      />
    </div>
  );
};
