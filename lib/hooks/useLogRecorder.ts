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
  /** セント単位の誤差（解析機構から直接取得） */
  centDeviations: (number | null)[] | null;
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
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  // 最新の値をuseRefで保持（useEffectの依存配列問題を回避）
  const latestValuesRef = useRef({
    analysisResult,
    centDeviations: inputCentDeviations,
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

    // タイマーをクリア
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, [isRecording]);

  /**
   * ログをクリア
   */
  const clearLog = useCallback(() => {
    sessionRef.current = null;
    setEntryCount(0);
    setIsRecording(false);

    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  /**
   * 解析実行中かつログ記録中の場合、100msごとにログを記録
   */
  useEffect(() => {
    console.log("[useLogRecorder] useEffect triggered", {
      isRecording,
      isProcessing,
    });

    if (isRecording && isProcessing) {
      // タイマーを設定（100ms間隔）
      console.log("[useLogRecorder] Setting up interval");
      intervalIdRef.current = setInterval(() => {
        // 最新の値をrefから取得
        const {
          analysisResult: currentAnalysisResult,
          centDeviations: currentCentDeviations,
          pitchList: currentPitchList,
          evalRangeCents: currentEvalRangeCents,
          a4Freq: currentA4Freq,
          evalThreshold: currentEvalThreshold,
          fftSize: currentFftSize,
          smoothingTimeConstant: currentSmoothingTimeConstant,
        } = latestValuesRef.current;

        // 直接ログを記録
        if (!sessionRef.current || !currentAnalysisResult) {
          console.log(
            "[useLogRecorder] Interval tick - no session or no analysisResult"
          );
          return;
        }

        const session = sessionRef.current;
        const now = new Date();
        const startTimeMs = new Date(session.startTime).getTime();
        const elapsedMs = now.getTime() - startTimeMs;

        // 解析機構から直接取得したセント誤差を使用（情報落ちなし）
        const centDeviations =
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
          centDeviations,
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
        console.log("[useLogRecorder] Entry recorded", {
          entryCount: session.entries.length,
          elapsedMs,
        });
      }, 100);

      return () => {
        console.log("[useLogRecorder] Cleaning up interval");
        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
        }
      };
    } else {
      // 記録停止時にタイマーをクリア
      if (intervalIdRef.current) {
        console.log(
          "[useLogRecorder] Clearing interval (not recording or not processing)"
        );
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    }
  }, [isRecording, isProcessing]); // 依存配列はbooleanのみ

  return {
    isRecording,
    entryCount,
    session: sessionRef.current,
    startRecording,
    stopRecording,
    clearLog,
  };
}
