import { useMemo, useState } from "react";
import { useAtomValue } from "jotai";

import { DISPLAY_SMOOTHING_TIME_CONSTANT_MS } from "@chordlens/core/constants";
import {
  alignResultsByKey,
  inTuneDeviationFromCents,
} from "@chordlens/core/feedback/tuningMetrics";
import { useAudioAnalysis } from "@/lib/hooks/useAudioAnalysis";
import { useChordFollow } from "@/lib/hooks/useChordFollow";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { useAutoStopOnHidden } from "@/lib/hooks/useAutoStopOnHidden";

import { AnalysisControl } from "@/components/feature/AnalysisControl";
import { FeedbackCarousel } from "@/components/feedback/FeedbackCarousel";
import { ChordHeader } from "@/components/feedback/ChordHeader";
import { PresetSwitcher } from "@/components/feature/PresetSwitcher";
import { CentDisplay } from "@/components/feature/CentDisplay";
import { Toaster } from "@/components/feature/Toaster";
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
  pitchAlgorithmAtom,
  swipeBandwidthCentsAtom,
  chordFollowEnabledAtom,
  chordFollowLockedAtom,
  chordFollowPendingAtom,
  inTuneCentsAtom,
  displaySmoothingAtom,
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
  const pitchAlgorithm = useAtomValue(pitchAlgorithmAtom);
  const swipeBandwidthCents = useAtomValue(swipeBandwidthCentsAtom);
  const chordFollowEnabled = useAtomValue(chordFollowEnabledAtom);
  const chordFollowLocked = useAtomValue(chordFollowLockedAtom);
  const chordFollowPending = useAtomValue(chordFollowPendingAtom);
  const inTuneCents = useAtomValue(inTuneCentsAtom);
  const displaySmoothing = useAtomValue(displaySmoothingAtom);

  const {
    isProcessing,
    isStarting,
    error,
    dismissError,
    analysisResult,
    analyzedPitchList,
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

  // 背面へ回ったら解析 (マイク) を止める。前面復帰時は自動再開せず、案内を出して次の「解析開始」を待つ。
  // isProcessing に従うため、WakeLock・構成音の自動追従も同時に止まり、再取得もされない
  const { autoStopped, clearAutoStopped } = useAutoStopOnHidden({
    // 初期化中に背面へ回った場合も止める (初期化完了後に開始されないよう取り消す)
    isProcessing: isProcessing || isStarting,
    stopProcessing,
  });

  // 構成音リストが自動追従で差し替わった直後は、結果がまだ旧リストで計算されている。
  // 位置ではなく音のキーで対応付け、旧リストの偏差が別の音に割り当たるのを防ぐ
  // (根音が変わった場合は基準が変わるため、旧結果はすべて捨てる)
  // 表示側は解析フレームごとの更新 (EMA・軌跡のサンプル追加) をこの配列の
  // 同一性で判定するため、解析結果か構成音が変わったときだけ作り直す
  const feedbackData = useMemo(() => {
    const aligned = alignResultsByKey(currentPitchList, analyzedPitchList, analysisResult);
    return currentPitchList.map((pitch, index) => ({ pitch, deviation: aligned[index] }));
  }, [currentPitchList, analyzedPitchList, analysisResult]);

  // 解析中は画面スリープを抑止する (実験フローは別ルートのため対象外)
  useWakeLock(isProcessing);

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

      <main className="mx-auto flex w-full max-w-2xl grow flex-col items-stretch gap-4 px-3 pt-3 pb-[calc(var(--bottom-bar-h,12rem)+1rem)] sm:px-6">
        {experimentMode && (
          <ExperimentModePanel
            isProcessing={isProcessing}
            analysisResult={analysisResult}
            centDeviations={centDeviations}
            peakSearchDebug={peakSearchDebug}
            comparisonResults={comparisonResults}
          />
        )}

        <FeedbackCarousel
          header={<ChordHeader pitchList={currentPitchList} />}
          transitioning={chordFollowEnabled && !chordFollowLocked && chordFollowPending}
          analysisData={feedbackData}
          evalRangeCents={evalRangeCents}
          a4Freq={a4Freq}
          holdEnabled={holdEnabled}
          inTuneDeviation={inTuneDeviationFromCents(inTuneCents, evalRangeCents)}
          smoothingMs={DISPLAY_SMOOTHING_TIME_CONSTANT_MS[displaySmoothing]}
        />

        <CentDisplay
          // 自動追従中は構成音の数 (2〜4 音) が変わるため 4 行ぶんの高さを確保する
          minRows={chordFollowEnabled ? 4 : 0}
          pitchList={currentPitchList}
          a4Freq={a4Freq}
          title="和音情報"
        />
      </main>

      <AnalysisControl
        isProcessing={isProcessing}
        startProcessing={() => {
          clearAutoStopped();
          void startProcessing();
        }}
        stopProcessing={stopProcessing}
        isPitchListEmpty={currentPitchList.length === 0}
        error={error}
        onDismissError={dismissError}
        autoStopped={autoStopped}
        topSlot={<PresetSwitcher onOpenSettings={() => setIsSettingsOpen(true)} />}
      />
      <Toaster />
    </div>
  );
}
