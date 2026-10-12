/**
 * useAudioAnalysis - 音声解析ファサードフック
 * 
 * useAudioContextとuseSpectrumAnalysisを組み合わせた
 * 公開API。既存のインターフェースを維持。
 */
import { useCallback, useState, useEffect, useRef } from "react";
import { useAudioContext } from "./audio/useAudioContext";
import { useSpectrumAnalysis } from "./audio/useSpectrumAnalysis";
import type { UseAudioAnalysisProps } from "@chordlens/core/types";

export function useAudioAnalysis({
  currentPitchList,
  evalRangeCents,
  a4Freq,
  evalThreshold,
  fftSize,
  smoothingTimeConstant,
  pitchAlgorithm,
  swipeBandwidthCents,
  enableComparison,
  enablePeakSearchDebug,
  peakSearchDebugFps,
}: UseAudioAnalysisProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** initialize() 待ちの間 true (この間に停止要求が来たら初期化完了後に破棄する) */
  const [isStarting, setIsStarting] = useState(false);
  const startingRef = useRef(false);
  const cancelStartRef = useRef(false);

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
    comparisonResults,
    startLoop,
    stopLoop,
    clearResults,
  } = useSpectrumAnalysis(nodesRef, spectrumDataRef, freqBinsRef, {
    currentPitchList,
    evalRangeCents,
    a4Freq,
    evalThreshold,
    pitchAlgorithm,
    swipeBandwidthCents,
    enableComparison,
    enablePeakSearchDebug,
    peakSearchDebugFps,
  });

  // 設定変更を追随
  useEffect(() => {
    updateSettings({ fftSize, smoothingTimeConstant });
  }, [fftSize, smoothingTimeConstant, updateSettings]);

  const startProcessing = useCallback(async () => {
    if (isProcessing || startingRef.current) return;
    startingRef.current = true;
    cancelStartRef.current = false;
    setIsStarting(true);
    setError(null);

    const success = await initialize();
    startingRef.current = false;
    setIsStarting(false);
    if (cancelStartRef.current) {
      // 初期化中に停止された (背面移行など): 確保したマイクを解放して開始しない
      if (success) cleanup();
      return;
    }
    if (success) {
      startLoop();
      setIsProcessing(true);
    } else {
      setError("マイクにアクセスできません。ブラウザの設定でマイクの使用を許可してください。");
    }
  }, [isProcessing, initialize, startLoop, cleanup]);

  const stopProcessing = useCallback(() => {
    if (startingRef.current) cancelStartRef.current = true;
    stopLoop();
    cleanup();
    clearResults();
    setIsProcessing(false);
  }, [stopLoop, cleanup, clearResults]);

  const dismissError = useCallback(() => setError(null), []);

  return {
    isProcessing,
    /** マイク初期化中 (getUserMedia / AudioContext 準備待ち) */
    isStarting,
    /** マイク取得失敗などのエラーメッセージ (次回の開始時にクリアされる) */
    error,
    dismissError,
    analysisResult,
    centDeviations,
    peakSearchDebug,
    comparisonResults,
    startProcessing,
    stopProcessing,
    /**
     * 解析中の AudioContext / マイク源 (停止中は null)。
     * 構成音の自動追従 (useChordFollow) がマイク入力グラフを二重に
     * 確保せずに済むよう、同じグラフを共有するために公開する
     */
    audioNodesRef: nodesRef,
  };
}
