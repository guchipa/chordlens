/**
 * useAudioAnalysis - 音声解析ファサードフック
 * 
 * useAudioContextとuseSpectrumAnalysisを組み合わせた
 * 公開API。既存のインターフェースを維持。
 */
import { useCallback, useState, useEffect } from "react";
import { useAudioContext } from "./audio/useAudioContext";
import { useSpectrumAnalysis } from "./audio/useSpectrumAnalysis";
import type { UseAudioAnalysisProps } from "@/lib/types";

export function useAudioAnalysis({
  currentPitchList,
  evalRangeCents,
  a4Freq,
  evalThreshold,
  fftSize,
  smoothingTimeConstant,
  enablePeakSearchDebug,
  peakSearchDebugFps,
}: UseAudioAnalysisProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  // AudioContext管理
  const {
    nodesRef,
    spectrumDataRef,
    freqBinsRef,
    initialize,
    cleanup,
    updateSettings,
  } = useAudioContext({ fftSize, smoothingTimeConstant });

  // スペクトラム解析
  const {
    analysisResult,
    centDeviations,
    peakSearchDebug,
    startLoop,
    stopLoop,
    clearResults,
  } = useSpectrumAnalysis(nodesRef, spectrumDataRef, freqBinsRef, {
    currentPitchList,
    evalRangeCents,
    a4Freq,
    evalThreshold,
    enablePeakSearchDebug,
    peakSearchDebugFps,
  });

  // 設定変更を追随
  useEffect(() => {
    updateSettings({ fftSize, smoothingTimeConstant });
  }, [fftSize, smoothingTimeConstant, updateSettings]);

  const startProcessing = useCallback(async () => {
    if (isProcessing) return;

    const success = await initialize();
    if (success) {
      startLoop();
      setIsProcessing(true);
    } else {
      alert("マイクへのアクセスを許可してください。");
    }
  }, [isProcessing, initialize, startLoop]);

  const stopProcessing = useCallback(() => {
    stopLoop();
    cleanup();
    clearResults();
    setIsProcessing(false);
  }, [stopLoop, cleanup, clearResults]);

  return {
    isProcessing,
    analysisResult,
    centDeviations,
    peakSearchDebug,
    startProcessing,
    stopProcessing,
  };
}
