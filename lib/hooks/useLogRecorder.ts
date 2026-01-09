/**
 * useLogRecorder - 評価実験用ログ記録フック
 *
 * 音声解析結果をタイムスタンプ付きで記録し、
 * CSV形式でエクスポートする機能を提供
 */

import { useRef, useCallback, useEffect, useState } from "react";
import type { LogEntry, LogSession, Pitch } from "@/lib/types";

interface UseLogRecorderProps {
  /** 解析が実行中かどうか */
  isProcessing: boolean;
  /** 現在の構成音リスト */
  pitchList: Pitch[];
  /** 解析結果（deviation値） */
  analysisResult: (number | null)[] | null;
  /** セント単位の誤差（解析機構から直接取得・Raw） */
  centDeviations: (number | null)[] | null;

  /** セント単位の誤差（表示用：EMA/ホールド等の後）。未指定ならログ出力は空欄 */
  centDeviationsDisplay?: (number | null)[] | null;

  /** 今フレームで検出できたか（pitchごと）。未指定ならログ出力は空欄 */
  isDetectedList?: boolean[] | null;

  /** 検出できないがホールドで表示したか（pitchごと）。未指定ならログ出力は空欄 */
  isHeldList?: boolean[] | null;
  /** 評価範囲（セント） */
  evalRangeCents: number;
  /** A4基準周波数 */
  a4Freq: number;
  /** 評価閾値 */
  evalThreshold: number;
  /** FFTサイズ */
  fftSize: number;
  /** スムージング定数 */
  smoothingTimeConstant: number;
}

interface UseLogRecorderReturn {
  /** ログ記録中かどうか */
  isRecording: boolean;
  /** 記録されたエントリ数 */
  entryCount: number;
  /** 現在のセッション情報 */
  session: LogSession | null;
  /** ログ記録を開始 */
  startRecording: () => void;
  /** ログ記録を停止 */
  stopRecording: () => void;
  /** ログをクリア */
  clearLog: () => void;
}

/**
 * UUIDv4を生成
 */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * deviation値をセント単位に変換（非推奨：解析機構から直接取得する方が精度が高い）
 * @deprecated 解析機構から直接centDeviationsを取得してください
 * @param deviation -1.0 ~ 1.0の値
 * @param evalRangeCents 評価範囲（セント）
 * @returns セント単位のズレ
 */
function deviationToCents(
  deviation: number | null,
  evalRangeCents: number
): number | null {
  if (deviation === null) return null;
  return deviation * evalRangeCents;
}

export function useLogRecorder({
  isProcessing,
  pitchList,
  analysisResult,
  centDeviations: inputCentDeviations,
  centDeviationsDisplay: inputCentDeviationsDisplay,
  isDetectedList: inputIsDetectedList,
  isHeldList: inputIsHeldList,
  evalRangeCents,
  a4Freq,
  evalThreshold,
  fftSize,
  smoothingTimeConstant,
}: UseLogRecorderProps): UseLogRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [entryCount, setEntryCount] = useState(0);

  // ログセッションをuseRefで保持（再レンダリングを避ける）
  const sessionRef = useRef<LogSession | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // 最新の値をuseRefで保持（useEffectの依存配列問題を回避）
  const latestValuesRef = useRef({
    analysisResult,
    centDeviations: inputCentDeviations,
    centDeviationsDisplay: inputCentDeviationsDisplay,
    isDetectedList: inputIsDetectedList,
    isHeldList: inputIsHeldList,
    pitchList,
    evalRangeCents,
    a4Freq,
    evalThreshold,
    fftSize,
    smoothingTimeConstant,
  });

  // 値が変更されたら常に最新の値で更新
  useEffect(() => {
    latestValuesRef.current = {
      analysisResult,
      centDeviations: inputCentDeviations,
      centDeviationsDisplay: inputCentDeviationsDisplay,
      isDetectedList: inputIsDetectedList,
      isHeldList: inputIsHeldList,
      pitchList,
      evalRangeCents,
      a4Freq,
      evalThreshold,
      fftSize,
      smoothingTimeConstant,
    };
  }, [
    analysisResult,
    inputCentDeviations,
    inputCentDeviationsDisplay,
    inputIsDetectedList,
    inputIsHeldList,
    pitchList,
    evalRangeCents,
    a4Freq,
    evalThreshold,
    fftSize,
    smoothingTimeConstant,
  ]);

  /**
   * ログ記録を開始
   */
  const startRecording = useCallback(() => {
    if (isRecording) return;

    const sessionId = generateUUID();
    const startTime = new Date().toISOString();

    sessionRef.current = {
      sessionId,
      startTime,
      endTime: null,
      entries: [],
      metadata: {
        userAgent: navigator.userAgent,
      },
    };

    setIsRecording(true);
    setEntryCount(0);
    console.log("[useLogRecorder] Recording started", { sessionId, startTime });
  }, [isRecording]);

  /**
   * ログ記録を停止
   */
  const stopRecording = useCallback(() => {
    if (!isRecording || !sessionRef.current) return;

    sessionRef.current.endTime = new Date().toISOString();
    setIsRecording(false);

    // リクエストをクリア
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, [isRecording]);

  /**
   * ログをクリア
   */
  const clearLog = useCallback(() => {
    sessionRef.current = null;
    setEntryCount(0);
    setIsRecording(false);

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const recordEntry = useCallback(() => {
    const {
      analysisResult: currentAnalysisResult,
      centDeviations: currentCentDeviations,
      centDeviationsDisplay: currentCentDeviationsDisplay,
      isDetectedList: currentIsDetectedList,
      isHeldList: currentIsHeldList,
      pitchList: currentPitchList,
      evalRangeCents: currentEvalRangeCents,
      a4Freq: currentA4Freq,
      evalThreshold: currentEvalThreshold,
      fftSize: currentFftSize,
      smoothingTimeConstant: currentSmoothingTimeConstant,
    } = latestValuesRef.current;

    if (!sessionRef.current || !currentAnalysisResult) return;

    const session = sessionRef.current;
    const now = new Date();
    const startTimeMs = new Date(session.startTime).getTime();
    const elapsedMs = now.getTime() - startTimeMs;

    const centDeviationsRaw =
      currentCentDeviations ||
      currentAnalysisResult.map((deviation) =>
        deviationToCents(deviation, currentEvalRangeCents)
      );

    const entry: LogEntry = {
      timestamp: now.toISOString(),
      elapsedMs,
      sessionId: session.sessionId,
      pitchList: [...currentPitchList],
      analysisResult: [...currentAnalysisResult],
      // 互換列: 解析生値（Raw）を入れる
      centDeviations: centDeviationsRaw,
      // 追加列: Raw/Display/Flags
      centDeviationsRaw,
      centDeviationsDisplay: currentCentDeviationsDisplay ?? null,
      isDetectedList: currentIsDetectedList ?? null,
      isHeldList: currentIsHeldList ?? null,
      settings: {
        a4Freq: currentA4Freq,
        evalRangeCents: currentEvalRangeCents,
        evalThreshold: currentEvalThreshold,
        fftSize: currentFftSize,
        smoothingTimeConstant: currentSmoothingTimeConstant,
      },
    };

    session.entries.push(entry);
    setEntryCount(session.entries.length);
    // NOTE: requestAnimationFrameで高頻度に呼ばれるため、毎フレームのconsole.logは避ける
  }, []);

  /**
   * 解析実行中かつログ記録中の場合、1フレームごとにログを記録
   */
  useEffect(() => {
    if (isRecording && isProcessing) {
      const tick = () => {
        recordEntry();
        rafIdRef.current = window.requestAnimationFrame(tick);
      };

      rafIdRef.current = window.requestAnimationFrame(tick);

      return () => {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      };
    }

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, [isRecording, isProcessing, recordEntry]); // 依存配列はbooleanのみ

  return {
    isRecording,
    entryCount,
    session: sessionRef.current,
    startRecording,
    stopRecording,
    clearLog,
  };
}
