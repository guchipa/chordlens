"use client";

import React from "react";
import { TunerMeter } from "@/components/TunerMeter";
import { StroboFeedback } from "./StroboFeedback";
import { BarFeedback } from "./BarFeedback";
import { NumericFeedback } from "./NumericFeedback";
import { WaveformFeedback } from "./WaveformFeedback";
import type { FeedbackType } from "@/lib/constants";
import type { formType } from "@/lib/schema";

interface UnifiedFeedbackProps {
  feedbackType: FeedbackType;
  analysisData: Array<{
    pitch: formType;
    deviation: number | null;
  }>;
  evalRangeCents: number;
}

export const UnifiedFeedback: React.FC<UnifiedFeedbackProps> = ({
  feedbackType,
  analysisData,
  evalRangeCents,
}) => {
  if (feedbackType === "meter") {
    return <TunerMeter analysisData={analysisData} />;
  }

  // 偏差がnullでないデータのみをフィルター
  const validData = analysisData.filter((data) => data.deviation !== null);

  if (validData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        解析データがありません
      </div>
    );
  }

  // ストロボ表示は横長なので縦に並べる
  if (feedbackType === "strobe") {
    return (
      <div className="flex flex-col gap-3 w-full max-w-4xl mx-auto">
        {validData.map((data) => {
          const key = `${data.pitch.pitchName}-${data.pitch.octaveNum}`;
          const pitchName = `${data.pitch.pitchName}${data.pitch.octaveNum}`;
          const deviation = data.deviation as number;

          return (
            <StroboFeedback
              key={key}
              pitchName={pitchName}
              deviation={deviation}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {validData.map((data) => {
        const key = `${data.pitch.pitchName}-${data.pitch.octaveNum}`;
        const pitchName = `${data.pitch.pitchName}${data.pitch.octaveNum}`;

        // TypeScript は deviation が null でないことを確認済み
        const deviation = data.deviation as number;

        switch (feedbackType) {
          case "bar":
            return (
              <BarFeedback
                key={key}
                pitchName={pitchName}
                deviation={deviation}
              />
            );

          case "numeric":
            return (
              <NumericFeedback
                key={key}
                pitchName={pitchName}
                deviation={deviation}
                evalRangeCents={evalRangeCents}
              />
            );

          case "waveform":
            return (
              <WaveformFeedback
                key={key}
                pitchName={pitchName}
                deviation={deviation}
              />
            );

          default:
            return null;
        }
      })}
    </div>
  );
};
