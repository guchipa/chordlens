"use client";

import React from "react";
import { TunerMeter } from "./MeterFeedback";
import { BarFeedback } from "./BarFeedback";
// import { StroboFeedback } from "./StroboFeedback";
// import { NumericFeedback } from "./NumericFeedback";
// import { WaveformFeedback } from "./WaveformFeedback";
import type { FeedbackType } from "@/lib/constants";
import type { formType } from "@/lib/schema";
import { CircleFeedback } from "./CircleFeedback";

interface UnifiedFeedbackProps {
  feedbackType: FeedbackType;
  analysisData: Array<{
    pitch: formType;
    deviation: number | null;
  }>;
  evalRangeCents: number;
  a4Freq?: number;
  /** 表示保持（ホールド）を有効にするか */
  holdEnabled?: boolean;
}

export const UnifiedFeedback: React.FC<UnifiedFeedbackProps> = ({
  feedbackType,
  analysisData,
  // evalRangeCents,
  a4Freq = 442,
  holdEnabled = true,
}) => {
  // 根音を見つける
  const rootPitch = analysisData.find((data) => data.pitch.isRoot);
  const rootPitchName = rootPitch
    ? `${rootPitch.pitch.pitchName}${rootPitch.pitch.octaveNum}`
    : undefined;

  // 有効な音のみフィルタリング
  analysisData = analysisData.filter((data) => data.pitch.enabled === true);

  if (feedbackType === "meter") {
    return (
      <TunerMeter
        title={"メーター"}
        analysisData={analysisData}
        rootPitchName={rootPitchName}
        a4Freq={a4Freq}
        holdEnabled={holdEnabled}
      />
    );
  }

  if (analysisData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        解析データがありません
      </div>
    );
  }

  // ストロボ表示は横長なので縦に並べる
  // if (feedbackType === "strobe") {
  //   return (
  //     <div className="flex flex-col gap-3 w-full max-w-4xl mx-auto">
  //       {analysisData.map((data) => {
  //         const key = `${data.pitch.pitchName}-${data.pitch.octaveNum}`;
  //         const pitchName = `${data.pitch.pitchName}${data.pitch.octaveNum}`;

  //         return (
  //           <StroboFeedback
  //             key={key}
  //             pitchName={pitchName}
  //             deviation={data.deviation}
  //           />
  //         );
  //       })}
  //     </div>
  //   );
  // }

  // バー表示も横長なので縦に並べる
  if (feedbackType === "bar") {
    return (
      <div className="flex flex-col gap-3 w-full max-w-4xl mx-auto">
        {analysisData.map((data) => {
          const key = `${data.pitch.pitchName}-${data.pitch.octaveNum}`;
          const pitchName = `${data.pitch.pitchName}${data.pitch.octaveNum}`;

          return (
            <BarFeedback
              key={key}
              pitchName={pitchName}
              deviation={data.deviation}
              rootPitchName={rootPitchName}
              a4Freq={a4Freq}
            />
          );
        })}
      </div>
    );
  }

  if (feedbackType === "circle") {
    // CircleFeedbackは1つの円で全ての音名を表示
    const circleData = analysisData.map((data) => ({
      pitchName: `${data.pitch.pitchName}${data.pitch.octaveNum}`,
      deviation: data.deviation,
    }));

    return (
      <div className="flex justify-center w-full px-4">
        <CircleFeedback analysisData={circleData} className="w-full max-w-3xl" />
      </div>
    );
  }

  // return (
  //   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  //     {analysisData.map((data) => {
  //       const key = `${data.pitch.pitchName}-${data.pitch.octaveNum}`;
  //       const pitchName = `${data.pitch.pitchName}${data.pitch.octaveNum}`;

  //       switch (feedbackType) {
  //         case "numeric":
  //           return (
  //             <NumericFeedback
  //               key={key}
  //               pitchName={pitchName}
  //               deviation={data.deviation}
  //               evalRangeCents={evalRangeCents}
  //             />
  //           );

  //         case "waveform":
  //           return (
  //             <WaveformFeedback
  //               key={key}
  //               pitchName={pitchName}
  //               deviation={data.deviation}
  //             />
  //           );

  //         default:
  //           return null;
  //       }
  //     })}
  //   </div>
  // );
};
