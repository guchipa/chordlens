"use client";

import { useState } from "react";

// フォームバリデーション関連
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// カスタムフック
import { useAudioAnalysis } from "@/lib/hooks/useAudioAnalysis";
import { usePitchList } from "@/lib/hooks/usePitchList";
import { useAudioSettings } from "@/lib/hooks/useAudioSettings";
import { useFeedbackType } from "@/lib/hooks/useFeedbackType";

// コンポーネント
import { AppFooter } from "@/components/AppFooter";
import { AnalysisControl } from "@/components/feature/AnalysisControl";
import { UnifiedFeedback } from "@/components/feedback/UnifiedFeedback";
import { CentDisplay } from "@/components/CentDisplay";
import { MainHeader } from "@/components/layout/MainHeader";
import { SettingsDrawer } from "@/components/layout/SettingsDrawer";
import { FormSchema, type Pitch } from "@/lib/types";

export default function HomePage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // フォーム管理
  const form = useForm<Pitch>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      pitchName: undefined,
      octaveNum: 4,
      isRoot: false,
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

  const { isProcessing, analysisResult, startProcessing, stopProcessing } =
    useAudioAnalysis({
      currentPitchList,
      evalRangeCents,
      a4Freq,
      evalThreshold,
      fftSize,
      smoothingTimeConstant,
    });

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
        setA4Freq={setA4Freq}
        setEvalThreshold={setEvalThreshold}
        setFftSize={setFftSize}
        setSmoothingTimeConstant={setSmoothingTimeConstant}
      />

      <main className="container mx-auto flex grow flex-col items-center gap-8 p-4 sm:p-8 md:p-12">
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
