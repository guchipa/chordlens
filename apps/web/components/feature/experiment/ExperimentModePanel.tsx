"use client";

/**
 * ExperimentModePanel - 実験モード機能をまとめたパネル
 * 
 * 責務:
 * - 実験モードバナー表示
 * - ログ記録機能（useLogRecorder）
 * - ピーク探索デバッグパネル
 * - 表示用セント偏差の計算
 */

import { useMemo, useRef } from "react";
import { useAtomValue } from "jotai";
import { useLogRecorder } from "@/lib/hooks/useLogRecorder";
import { LogExportButton } from "@/components/feature/LogExportButton";
import { PeakSearchBinsPanel } from "@/components/feature/PeakSearchBinsPanel";
import { AlgorithmComparisonPanel } from "@/components/feature/AlgorithmComparisonPanel";
import {
    pitchListAtom,
    evalRangeCentsAtom,
    a4FreqAtom,
    evalThresholdAtom,
    fftSizeAtom,
    smoothingTimeConstantAtom,
    holdEnabledAtom,
} from "@/lib/store";
import { METER_NEEDLE_HOLD_MS, METER_NEEDLE_SMOOTHING_ALPHA } from "@chordlens/core/constants";
import { updateEmaHoldList, type EmaHoldState } from "@chordlens/core/utils/emaHold";
import type { PeakSearchDebug, AlgorithmComparisonEntry } from "@chordlens/core/types";

export interface ExperimentModePanelProps {
    /** 解析中かどうか */
    isProcessing: boolean;
    /** 解析結果（deviation配列） */
    analysisResult: (number | null)[] | null;
    /** セント単位の偏差 */
    centDeviations: (number | null)[] | null;
    /** ピーク探索デバッグ情報 */
    peakSearchDebug: PeakSearchDebug[] | null;
    /** FFT vs SWIPE' 比較結果 */
    comparisonResults: AlgorithmComparisonEntry[] | null;
}

export function ExperimentModePanel({
    isProcessing,
    analysisResult,
    centDeviations,
    peakSearchDebug,
    comparisonResults,
}: ExperimentModePanelProps) {
    // Jotai atoms から状態を取得
    const currentPitchList = useAtomValue(pitchListAtom);
    const evalRangeCents = useAtomValue(evalRangeCentsAtom);
    const a4Freq = useAtomValue(a4FreqAtom);
    const evalThreshold = useAtomValue(evalThresholdAtom);
    const fftSize = useAtomValue(fftSizeAtom);
    const smoothingTimeConstant = useAtomValue(smoothingTimeConstantAtom);
    const holdEnabled = useAtomValue(holdEnabledAtom);

    // Display系列（EMA/ホールド）の状態を保持
    const centDisplayStateRef = useRef<Map<string, EmaHoldState>>(new Map());

    // 表示用セント偏差の計算
    const { centDeviationsDisplay, isDetectedList, isHeldList } = useMemo(() => {
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
                holdMs: holdEnabled ? METER_NEEDLE_HOLD_MS : 0,
            }
        );

        return {
            centDeviationsDisplay: result.values,
            isDetectedList: result.isDetectedList,
            isHeldList: result.isHeldList,
        };
    }, [currentPitchList, centDeviations, analysisResult, evalRangeCents, holdEnabled]);

    // ログ記録フック
    const {
        isRecording,
        entryCount,
        session,
        startRecording,
        stopRecording,
        clearLog,
    } = useLogRecorder({
        isProcessing,
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

    return (
        <>
            {/* 実験モードバナー */}
            <div className="w-full max-w-2xl bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h2 className="text-lg font-bold text-amber-900">🔬 実験モード</h2>
                <p className="text-sm text-amber-700 mt-1">
                    実験用機能が有効です。解析データをログ記録できます。
                </p>
            </div>

            {/* ログコントロール */}
            <LogExportButton
                isRecording={isRecording}
                entryCount={entryCount}
                session={session}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                onClearLog={clearLog}
            />

            {/* アルゴリズム比較テーブル */}
            {comparisonResults && comparisonResults.length > 0 && (
                <AlgorithmComparisonPanel entries={comparisonResults} />
            )}

            {/* ピーク探索デバッグパネル */}
            <PeakSearchBinsPanel
                peakSearchDebug={peakSearchDebug}
                isProcessing={isProcessing}
                evalThresholdDb={evalThreshold}
            />
        </>
    );
}
