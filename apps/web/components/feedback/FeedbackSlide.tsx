"use client";

import React from "react";
import type { FeedbackType } from "@chordlens/core/constants";
import type { Pitch } from "@chordlens/core/types";
import { Card, CardContent } from "@/components/ui/card";
import { TunerMeter } from "./MeterFeedback";
import { BarListFeedback } from "./BarFeedback";
import { CircleSlide } from "./CircleFeedback";
import { VoiceLanesFeedback } from "./VoiceLanesFeedback";
import { PurityFeedback } from "./PurityFeedback";
import { TrajectoryFeedback } from "./TrajectoryFeedback";

export interface FeedbackDatum {
  pitch: Pitch;
  /** ±evalRangeCents を ±1 に正規化した偏差。未検出は null */
  deviation: number | null;
}

export interface FeedbackSlideProps {
  feedbackType: FeedbackType;
  analysisData: FeedbackDatum[];
  evalRangeCents: number;
  a4Freq: number;
  holdEnabled: boolean;
  /**
   * 和音の切替中 (自動追従の推定が確定値と食い違う間)。この間の偏差は
   * 旧和音を基準にしているため、信頼できない値として扱う
   */
  transitioning?: boolean;
}

const EMPTY_MESSAGE = (
  <p className="py-8 text-center text-muted-foreground">解析データがありません</p>
);

/**
 * メイン画面のカルーセルの 1 枚 (フィードバック形式 1 つぶん)。
 * 形式の切替 UI は持たず、FeedbackCarousel が外側に置く。
 */
export const FeedbackSlide: React.FC<FeedbackSlideProps> = ({
  feedbackType,
  analysisData,
  evalRangeCents,
  a4Freq,
  holdEnabled,
  transitioning = false,
}) => {
  const rootPitch = analysisData.find((d) => d.pitch.isRoot);
  const rootPitchName = rootPitch
    ? `${rootPitch.pitch.pitchName}${rootPitch.pitch.octaveNum}`
    : undefined;
  const enabled = analysisData.filter((d) => d.pitch.enabled === true);

  if (feedbackType === "meter") {
    return (
      <TunerMeter
        title={null}
        hideHeader
        analysisData={enabled}
        rootPitchName={rootPitchName}
        a4Freq={a4Freq}
        holdEnabled={holdEnabled}
        variant="enhanced"
      />
    );
  }

  if (feedbackType === "lanes") {
    return (
      <VoiceLanesFeedback
        analysisData={enabled}
        evalRangeCents={evalRangeCents}
        holdEnabled={holdEnabled}
      />
    );
  }

  if (feedbackType === "purity") {
    return (
      <PurityFeedback
        analysisData={enabled}
        evalRangeCents={evalRangeCents}
        holdEnabled={holdEnabled}
      />
    );
  }

  if (feedbackType === "trajectory") {
    return (
      <TrajectoryFeedback
        analysisData={enabled}
        evalRangeCents={evalRangeCents}
        transitioning={transitioning}
      />
    );
  }

  if (enabled.length === 0) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="px-3 py-3">{EMPTY_MESSAGE}</CardContent>
      </Card>
    );
  }

  if (feedbackType === "bar") {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="flex flex-col gap-2 px-3 py-3">
          <BarListFeedback
            analysisData={enabled}
            evalRangeCents={evalRangeCents}
            a4Freq={a4Freq}
            holdEnabled={holdEnabled}
          />
          <div
            aria-hidden="true"
            className="mr-14 ml-[5rem] flex justify-between text-xs text-muted-foreground"
          >
            <span>← 低い</span>
            <span>合っている</span>
            <span>高い →</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // circle
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent className="flex justify-center px-3 py-3">
        <CircleSlide
          analysisData={enabled}
          holdEnabled={holdEnabled}
          className="w-full max-w-[360px]"
        />
      </CardContent>
    </Card>
  );
};
