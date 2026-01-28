"use client";

import { useState } from "react";
import { useAtomValue } from "jotai";

// カスタムフック（音声解析のみ使用）
import { useAudioAnalysis } from "@/lib/hooks/useAudioAnalysis";

// コンポーネント
import { AppFooter } from "@/components/layout/AppFooter";
import { AnalysisControl } from "@/components/feature/AnalysisControl";
import { UnifiedFeedback } from "@/components/feedback/UnifiedFeedback";
import { CentDisplay } from "@/components/feature/CentDisplay";
import { MainHeader } from "@/components/layout/MainHeader";
import { SettingsDrawer } from "@/components/layout/SettingsDrawer";
import { ExperimentModePanel } from "@/components/feature/experiment/ExperimentModePanel";

// Jotai atoms
import {
  pitchListAtom,
  evalRangeCentsAtom,
  a4FreqAtom,
  evalThresholdAtom,
  fftSizeAtom,
  smoothingTimeConstantAtom,
  holdEnabledAtom,
  experimentModeAtom,
  feedbackTypeAtom,
} from "@/lib/store";

export default function HomePage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Jotai atoms から状態を取得
  const currentPitchList = useAtomValue(pitchListAtom);
  const evalRangeCents = useAtomValue(evalRangeCentsAtom);
  const a4Freq = useAtomValue(a4FreqAtom);
  const evalThreshold = useAtomValue(evalThresholdAtom);
  const fftSize = useAtomValue(fftSizeAtom);
  const smoothingTimeConstant = useAtomValue(smoothingTimeConstantAtom);
  const holdEnabled = useAtomValue(holdEnabledAtom);
  const experimentMode = useAtomValue(experimentModeAtom);
  const feedbackType = useAtomValue(feedbackTypeAtom);

  // 音声解析フック
  const {
    isProcessing,
    analysisResult,
    centDeviations,
    peakSearchDebug,
    startProcessing,
    stopProcessing,
  } = useAudioAnalysis({
    currentPitchList,
    evalRangeCents,
    a4Freq,
    evalThreshold,
    fftSize,
    smoothingTimeConstant,
    enablePeakSearchDebug: experimentMode,
    peakSearchDebugFps: experimentMode ? 12 : undefined,
  });

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 設定ドロワー */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onOpen={() => setIsSettingsOpen(true)}
        onClose={() => setIsSettingsOpen(false)}
      />

      <main className="container mx-auto flex grow flex-col items-center gap-8 p-4 sm:p-8 md:p-12">
        {/* 実験モード：バナー、ログ、デバッグパネル */}
        {experimentMode && (
          <ExperimentModePanel
            isProcessing={isProcessing}
            analysisResult={analysisResult}
            centDeviations={centDeviations}
            peakSearchDebug={peakSearchDebug}
          />
        )}

        <MainHeader />
        <AnalysisControl
          isProcessing={isProcessing}
          startProcessing={startProcessing}
          stopProcessing={stopProcessing}
          isPitchListEmpty={currentPitchList.length === 0}
        />
        {isProcessing && (
          <p className="mt-4 font-medium text-blue-600">
            マイク入力からの解析中...
          </p>
        )}

        <UnifiedFeedback
          feedbackType={feedbackType}
          analysisData={currentPitchList.map((pitch, index) => ({
            pitch,
            deviation: analysisResult?.[index] ?? null,
          }))}
          evalRangeCents={evalRangeCents}
          a4Freq={a4Freq}
          holdEnabled={holdEnabled}
        />
        <CentDisplay
          pitchList={currentPitchList}
          a4Freq={a4Freq}
          title="和音情報"
        />
      </main>
      <AppFooter />
    </div>
  );
}
