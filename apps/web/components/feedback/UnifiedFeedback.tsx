"use client";

import React, { useState } from "react";
import { useSetAtom } from "jotai";
import { TunerMeter } from "./MeterFeedback";
import { BarFeedback } from "./BarFeedback";
// import { StroboFeedback } from "./StroboFeedback";
// import { NumericFeedback } from "./NumericFeedback";
// import { WaveformFeedback } from "./WaveformFeedback";
import {
  LEGACY_FEEDBACK_TYPES,
  toLegacyFeedbackType,
  type FeedbackType,
  type LegacyFeedbackType,
} from "@chordlens/core/constants";
import { stepItem } from "@chordlens/core/gestures/swipeIntent";
import type { Pitch } from "@chordlens/core/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CircleFeedback } from "./CircleFeedback";
import { FeedbackTypeSwitch } from "./FeedbackTypeSwitch";
import { useSwipeNav } from "@/lib/hooks/useSwipeNav";
import { feedbackTypeAtom } from "@/lib/store";
import { cn } from "@/lib/utils";

interface UnifiedFeedbackProps {
  feedbackType: FeedbackType;
  analysisData: Array<{
    pitch: Pitch;
    deviation: number | null;
  }>;
  evalRangeCents: number;
  a4Freq?: number;
  /** 表示保持（ホールド）を有効にするか */
  holdEnabled?: boolean;
}

/** カードヘッダ: 形式切替のセグメント (タイトルの代わり) */
const SWITCH_HEADER_CLASS = "px-3 pt-3 pb-0";

/**
 * 評価実験画面 (/experiments) 用のフィードバック表示。
 * 被験者条件を変えないため従来の 3 形式・従来の描画のまま固定する。
 * メイン画面は FeedbackCarousel を使う。
 */
export const UnifiedFeedback: React.FC<UnifiedFeedbackProps> = ({
  feedbackType: storedType,
  analysisData,
  // evalRangeCents,
  a4Freq = 442,
  holdEnabled = true,
}) => {
  const setFeedbackType = useSetAtom(feedbackTypeAtom);
  // メイン画面で新しい形式が選ばれていても、ここでは従来のメーターで描く
  const feedbackType = toLegacyFeedbackType(storedType);
  // 切替方向 (左右どちらから入るか)。形式が変わった描画中に算出する
  const [prevType, setPrevType] = useState(feedbackType);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  if (prevType !== feedbackType) {
    setPrevType(feedbackType);
    setDirection(
      LEGACY_FEEDBACK_TYPES.indexOf(feedbackType) >= LEGACY_FEEDBACK_TYPES.indexOf(prevType)
        ? "next"
        : "prev",
    );
  }

  const go = (step: 1 | -1) => {
    const next = stepItem(LEGACY_FEEDBACK_TYPES, feedbackType, step);
    if (next) setFeedbackType(next);
  };
  const swipe = useSwipeNav({ onNext: () => go(1), onPrev: () => go(-1) });

  const header = (
    <CardHeader className={SWITCH_HEADER_CLASS}>
      <FeedbackTypeSwitch />
    </CardHeader>
  );

  return (
    <div
      data-slot="feedback-swipe-area"
      className="mx-auto w-full max-w-md"
      {...swipe}
    >
      {/* 形式が変わるたびに再マウントし、カード本体 (最後の子) だけを左右からスライドインさせる */}
      <div
        key={feedbackType}
        className={cn(
          "[&>div>div:last-child]:animate-in [&>div>div:last-child]:fade-in [&>div>div:last-child]:duration-200 motion-reduce:[&>div>div:last-child]:animate-none",
          direction === "next"
            ? "[&>div>div:last-child]:slide-in-from-right-6"
            : "[&>div>div:last-child]:slide-in-from-left-6",
        )}
      >
        <FeedbackBody
          feedbackType={feedbackType}
          analysisData={analysisData}
          a4Freq={a4Freq}
          holdEnabled={holdEnabled}
          header={header}
        />
      </div>
    </div>
  );
};

interface FeedbackBodyProps {
  feedbackType: LegacyFeedbackType;
  analysisData: UnifiedFeedbackProps["analysisData"];
  a4Freq: number;
  holdEnabled: boolean;
  header: React.ReactNode;
}

const FeedbackBody: React.FC<FeedbackBodyProps> = ({
  feedbackType,
  analysisData,
  a4Freq,
  holdEnabled,
  header,
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
        title={header}
        analysisData={analysisData}
        rootPitchName={rootPitchName}
        a4Freq={a4Freq}
        holdEnabled={holdEnabled}
      />
    );
  }

  if (analysisData.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto">
        {header}
        <CardContent className="px-3 pb-3 pt-1">
          <p className="py-8 text-center text-muted-foreground">解析データがありません</p>
        </CardContent>
      </Card>
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
      <Card className="w-full max-w-md mx-auto">
        {header}
        <CardContent className="flex flex-col gap-2 px-3 pb-3 pt-2">
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
          {/* 全バー共通の目盛り凡例 (バー列に揃える) */}
          <div
            aria-hidden="true"
            className="ml-[4.5rem] flex justify-between text-xs text-muted-foreground"
          >
            <span>← 低い</span>
            <span>合っている</span>
            <span>高い →</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (feedbackType === "circle") {
    // CircleFeedbackは1つの円で全ての音名を表示
    const circleData = analysisData.map((data) => ({
      pitchName: `${data.pitch.pitchName}${data.pitch.octaveNum}`,
      deviation: data.deviation,
    }));

    return (
      <Card className="w-full max-w-md mx-auto">
        {header}
        <CardContent className="flex justify-center px-3 pb-3 pt-1">
          <CircleFeedback analysisData={circleData} className="w-full max-w-[360px]" />
        </CardContent>
      </Card>
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
