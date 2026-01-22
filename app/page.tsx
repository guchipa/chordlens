"use client";

import { useCallback, useMemo, useRef, useState } from "react";

// フォームバリデーション関連
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";

// カスタムフック
import { useAudioAnalysis } from "@/lib/hooks/useAudioAnalysis";
import { usePitchList } from "@/lib/hooks/usePitchList";
import { useAudioSettings } from "@/lib/hooks/useAudioSettings";
import { useFeedbackType } from "@/lib/hooks/useFeedbackType";
import { useLogRecorder } from "@/lib/hooks/useLogRecorder";

// コンポーネント
import { AppFooter } from "@/components/layout/AppFooter";
import { AnalysisControl } from "@/components/feature/AnalysisControl";
import { UnifiedFeedback } from "@/components/feedback/UnifiedFeedback";
import { CentDisplay } from "@/components/feature/CentDisplay";
import { MainHeader } from "@/components/layout/MainHeader";
import { SettingsDrawer } from "@/components/layout/SettingsDrawer";
import { LogExportButton } from "@/components/feature/LogExportButton";
import { PeakSearchBinsPanel } from "@/components/feature/PeakSearchBinsPanel";
import { FormSchema, type Pitch } from "@/lib/types";
import { METER_NEEDLE_HOLD_MS, METER_NEEDLE_SMOOTHING_ALPHA } from "@/lib/constants";
import { updateEmaHoldList, type EmaHoldState } from "@/lib/utils/emaHold";

export default function HomePage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [experimentMode, setExperimentMode] = useState(false);

  // Display系列（EMA/ホールド）の状態を保持（実験モード用）
  const centDisplayStateRef = useRef<Map<string, EmaHoldState>>(new Map());

  // フォーム管理
  const form = useForm<Pitch>({
    resolver: zodResolver(FormSchema) as Resolver<Pitch>,
    defaultValues: {
      pitchName: undefined,
      octaveNum: 4,
      isRoot: false,
      enabled: true,
    },
  });

  // カスタムフック
  const {
    currentPitchList,
    setCurrentPitchList,
    onSubmit,
    removePitch,
    clearPitchList,
    handleLoadPreset,
  } = usePitchList(form);

  const {
    evalRangeCents,
    setEvalRangeCents,
    a4Freq,
    setA4Freq,
    evalThreshold,
    setEvalThreshold,
    fftSize,
    setFftSize,
    smoothingTimeConstant,
    setSmoothingTimeConstant,
  } = useAudioSettings();

  const { feedbackType, handleFeedbackTypeChange } = useFeedbackType();

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

  // 実験モード用：ログ記録フック
  const { centDeviationsDisplay, isDetectedList, isHeldList } = useMemo(() => {
    if (!experimentMode) {
      return {
        centDeviationsDisplay: null,
        isDetectedList: null,
        isHeldList: null,
      };
    }

    const keys = currentPitchList.map(
      (p) => `${p.pitchName}${p.octaveNum}`
    );

    const rawCentDeviations: Array<number | null> = keys.map((_, i) => {
      const raw = centDeviations?.[i];
      if (raw !== undefined) return raw ?? null;

      const fallback = analysisResult?.[i];
      if (fallback === undefined) return null;
      return fallback === null ? null : fallback * evalRangeCents;
    });

    const now = performance.now();
    const result = updateEmaHoldList(
      centDisplayStateRef.current,
      keys,
      rawCentDeviations,
      now,
      {
        alpha: METER_NEEDLE_SMOOTHING_ALPHA,
        holdMs: METER_NEEDLE_HOLD_MS,
      }
    );

    return {
      centDeviationsDisplay: result.values,
      isDetectedList: result.isDetectedList,
      isHeldList: result.isHeldList,
    };
  }, [experimentMode, currentPitchList, centDeviations, analysisResult, evalRangeCents]);

  const {
    isRecording,
    entryCount,
    session,
    startRecording,
    stopRecording,
    clearLog,
  } = useLogRecorder({
    isProcessing: experimentMode ? isProcessing : false,
    pitchList: currentPitchList,
    analysisResult,
    centDeviations,
    centDeviationsDisplay,
    isDetectedList,
    isHeldList,
    evalRangeCents,
    a4Freq,
    evalThreshold,
    fftSize,
    smoothingTimeConstant,
  });

  // 実験モード変更ハンドラ（useCallbackでメモ化）
  const handleExperimentModeChange = useCallback((enabled: boolean) => {
    setExperimentMode(enabled);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 設定ドロワー */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onOpen={() => setIsSettingsOpen(true)}
        onClose={() => setIsSettingsOpen(false)}
        form={form}
        onSubmit={onSubmit}
        currentPitchList={currentPitchList}
        setCurrentPitchList={setCurrentPitchList}
        removePitch={removePitch}
        clearPitchList={clearPitchList}
        handleLoadPreset={handleLoadPreset}
        feedbackType={feedbackType}
        handleFeedbackTypeChange={handleFeedbackTypeChange}
        setEvalRangeCents={setEvalRangeCents}
        a4Freq={a4Freq}
        setA4Freq={setA4Freq}
        setEvalThreshold={setEvalThreshold}
        setFftSize={setFftSize}
        setSmoothingTimeConstant={setSmoothingTimeConstant}
        onExperimentModeChange={handleExperimentModeChange}
      />

      <main className="container mx-auto flex grow flex-col items-center gap-8 p-4 sm:p-8 md:p-12">
        {/* 実験モード表示 */}
        {experimentMode && (
          <div className="w-full max-w-2xl bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h2 className="text-lg font-bold text-amber-900">🔬 実験モード</h2>
            <p className="text-sm text-amber-700 mt-1">
              実験用機能が有効です。解析データをログ記録できます。
            </p>
          </div>
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

        {/* 実験モード：ログコントロール */}
        {experimentMode && (
          <LogExportButton
            isRecording={isRecording}
            entryCount={entryCount}
            session={session}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onClearLog={clearLog}
          />
        )}

        {/* 実験モード：周波数観測パネル */}
        {experimentMode && (
          <PeakSearchBinsPanel
            peakSearchDebug={peakSearchDebug}
            isProcessing={isProcessing}
            evalThresholdDb={evalThreshold}
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
