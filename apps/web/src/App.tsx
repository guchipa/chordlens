import { useState } from "react";
import { useAtomValue } from "jotai";

import { useAudioAnalysis } from "@/lib/hooks/useAudioAnalysis";
import { useChordFollow } from "@/lib/hooks/useChordFollow";

import { AnalysisControl } from "@/components/feature/AnalysisControl";
import { UnifiedFeedback } from "@/components/feedback/UnifiedFeedback";
import { CentDisplay } from "@/components/feature/CentDisplay";
import { SettingsDrawer } from "@/components/layout/SettingsDrawer";
import { ExperimentModePanel } from "@/components/feature/experiment/ExperimentModePanel";

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
  pitchAlgorithmAtom,
  swipeBandwidthCentsAtom,
} from "@/lib/store";

export function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const currentPitchList = useAtomValue(pitchListAtom);
  const evalRangeCents = useAtomValue(evalRangeCentsAtom);
  const a4Freq = useAtomValue(a4FreqAtom);
  const evalThreshold = useAtomValue(evalThresholdAtom);
  const fftSize = useAtomValue(fftSizeAtom);
  const smoothingTimeConstant = useAtomValue(smoothingTimeConstantAtom);
  const holdEnabled = useAtomValue(holdEnabledAtom);
  const experimentMode = useAtomValue(experimentModeAtom);
  const feedbackType = useAtomValue(feedbackTypeAtom);
  const pitchAlgorithm = useAtomValue(pitchAlgorithmAtom);
  const swipeBandwidthCents = useAtomValue(swipeBandwidthCentsAtom);

  const {
    isProcessing,
    error,
    dismissError,
    analysisResult,
    centDeviations,
    peakSearchDebug,
    comparisonResults,
    startProcessing,
    stopProcessing,
    audioNodesRef,
  } = useAudioAnalysis({
    currentPitchList,
    evalRangeCents,
    a4Freq,
    evalThreshold,
    fftSize,
    smoothingTimeConstant,
    pitchAlgorithm,
    swipeBandwidthCents,
    enableComparison: experimentMode,
    enablePeakSearchDebug: experimentMode,
    peakSearchDebugFps: experimentMode ? 12 : undefined,
  });

  // 構成音の自動追従ループ (トグルは SettingsDrawer 内、状態は Jotai atom)。
  // 解析実行中のみ、チューナー本体の音声グラフを共有して推定を行う
  useChordFollow({ active: isProcessing, audioNodesRef });

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <header className="sticky top-0 z-40 border-b bg-gray-50/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex h-14 items-center gap-1 px-2">
          <SettingsDrawer
            isOpen={isSettingsOpen}
            onOpen={() => setIsSettingsOpen(true)}
            onClose={() => setIsSettingsOpen(false)}
          />
          <h1 className="text-lg font-bold text-gray-800">和音チューナー</h1>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl grow flex-col items-stretch gap-4 px-3 pt-3 pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:px-6">
        {experimentMode && (
          <ExperimentModePanel
            isProcessing={isProcessing}
            analysisResult={analysisResult}
            centDeviations={centDeviations}
            peakSearchDebug={peakSearchDebug}
            comparisonResults={comparisonResults}
          />
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

      <AnalysisControl
        isProcessing={isProcessing}
        startProcessing={startProcessing}
        stopProcessing={stopProcessing}
        isPitchListEmpty={currentPitchList.length === 0}
        error={error}
        onDismissError={dismissError}
      />
    </div>
  );
}
