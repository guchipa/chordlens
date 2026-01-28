/**
 * useSpectrumAnalysis - スペクトラム解析ループフック
 * 
 * 責務:
 * - requestAnimationFrameベースの解析ループ管理
 * - evaluateSpectrum呼び出し
 * - 結果のステート更新
 * - peakSearchDebug情報の生成
 */
import { useRef, useCallback, useState, useEffect } from "react";
import { evaluateSpectrum } from "@/lib/audio_analysis/justAnalyze";
import type { PeakSearchDebug, Pitch } from "@/lib/types";
import { getClientLogFps, sendVercelClientLog } from "@/lib/vercelClientLog";
import type { AudioNodes } from "./useAudioContext";

export interface SpectrumAnalysisOptions {
    currentPitchList: Pitch[];
    evalRangeCents: number;
    a4Freq: number;
    evalThreshold: number;
    enablePeakSearchDebug?: boolean;
    peakSearchDebugFps?: number;
}

export interface UseSpectrumAnalysisReturn {
    /** 解析結果（-1.0〜1.0のdeviation） */
    analysisResult: (number | null)[] | null;
    /** セント単位の偏差 */
    centDeviations: (number | null)[] | null;
    /** ピーク探索デバッグ情報 */
    peakSearchDebug: PeakSearchDebug[] | null;
    /** 解析ループ開始 */
    startLoop: () => void;
    /** 解析ループ停止 */
    stopLoop: () => void;
    /** 結果をクリア */
    clearResults: () => void;
}

export function useSpectrumAnalysis(
    nodesRef: React.RefObject<AudioNodes | null>,
    spectrumDataRef: React.RefObject<Float32Array | null>,
    freqBinsRef: React.RefObject<number[] | null>,
    options: SpectrumAnalysisOptions
): UseSpectrumAnalysisReturn {
    const [analysisResult, setAnalysisResult] = useState<(number | null)[] | null>(null);
    const [centDeviations, setCentDeviations] = useState<(number | null)[] | null>(null);
    const [peakSearchDebug, setPeakSearchDebug] = useState<PeakSearchDebug[] | null>(null);

    const animationFrameIdRef = useRef<number | null>(null);
    const lastPeakDebugUpdateMsRef = useRef<number>(0);
    const hasPeakSearchDebugRef = useRef<boolean>(false);

    // クライアントログ用
    const clientLogSessionIdRef = useRef<string>(
        typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`
    );
    const lastClientLogUpdateMsRef = useRef<number>(0);

    // 最新のオプションを保持
    const optionsRef = useRef(options);
    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    // デバッグ用フレームカウンタ
    const debugFrameCountRef = useRef(0);

    const analyzeFrame = useCallback(() => {
        const nodes = nodesRef.current;
        const spectrumData = spectrumDataRef.current;
        const freqBins = freqBinsRef.current;

        if (!nodes || !spectrumData || !freqBins) {
            animationFrameIdRef.current = requestAnimationFrame(analyzeFrame);
            return;
        }

        const { analyserNode, audioContext } = nodes;
        const props = optionsRef.current;

        // DEBUG: 30フレームごとにスペクトルの最大値をログ出力
        debugFrameCountRef.current++;
        if (debugFrameCountRef.current % 30 === 0) {
            const tempSpec = new Float32Array(analyserNode.frequencyBinCount);
            analyserNode.getFloatFrequencyData(tempSpec);
            const maxDb = Math.max(...tempSpec);
            console.log("[AudioDebug] Max spectrum dB:", maxDb.toFixed(1), "| AudioContext state:", audioContext.state);
        }

        const enableClientLog = process.env.NEXT_PUBLIC_VERCEL_CLIENT_LOG === "1";

        // スペクトラムデータ取得
        if (spectrumData.length !== analyserNode.frequencyBinCount) {
            // サイズが変更された場合は次フレームで再試行
            animationFrameIdRef.current = requestAnimationFrame(analyzeFrame);
            return;
        }

        analyserNode.getFloatFrequencyData(spectrumData as Float32Array<ArrayBuffer>);

        // スペクトラム評価
        const results = evaluateSpectrum(
            spectrumData,
            freqBins,
            props.currentPitchList,
            props.evalRangeCents,
            props.a4Freq,
            props.evalThreshold,
            { includeDebug: props.enablePeakSearchDebug || enableClientLog }
        );

        setAnalysisResult(results.map((r) => r.deviation));
        setCentDeviations(results.map((r) => r.centDeviation));

        // クライアントログ送信
        if (enableClientLog && results.length > 0) {
            const fps = getClientLogFps(1);
            const minIntervalMs = fps <= 0 ? 0 : 1000 / fps;
            const nowMs = performance.now();

            if (nowMs - lastClientLogUpdateMsRef.current >= minIntervalMs) {
                lastClientLogUpdateMsRef.current = nowMs;

                const n = Math.min(props.currentPitchList.length, results.length);
                sendVercelClientLog({
                    type: "audio-analysis",
                    sessionId: clientLogSessionIdRef.current,
                    t: Date.now(),
                    settings: {
                        a4Freq: props.a4Freq,
                        evalRangeCents: props.evalRangeCents,
                        evalThreshold: props.evalThreshold,
                        fftSize: analyserNode.fftSize,
                        smoothingTimeConstant: analyserNode.smoothingTimeConstant,
                    },
                    components: Array.from({ length: n }, (_, idx) => {
                        const pitch = props.currentPitchList[idx];
                        const r = results[idx];
                        return {
                            pitch,
                            deviation: r?.deviation ?? null,
                            centDeviation: r?.centDeviation ?? null,
                            expectedFreqHz: r?.debug?.estFreqHz ?? null,
                            detectedFreqHz: r?.debug?.peak?.freqHz ?? null,
                            detectedDb: r?.debug?.peak?.db ?? null,
                        };
                    }),
                });
            }
        }

        // ピーク探索デバッグ情報
        if (props.enablePeakSearchDebug) {
            const fps = props.peakSearchDebugFps ?? 12;
            const minIntervalMs = fps <= 0 ? 0 : 1000 / fps;
            const nowMs = performance.now();

            if (nowMs - lastPeakDebugUpdateMsRef.current >= minIntervalMs) {
                lastPeakDebugUpdateMsRef.current = nowMs;

                const debugList: PeakSearchDebug[] = results
                    .map((r, idx): PeakSearchDebug | null => {
                        const debug = r.debug;
                        const pitch = props.currentPitchList[idx];
                        if (!debug || !pitch) return null;

                        const minIdx = Math.max(0, Math.min(spectrumData.length, debug.range.minIdx));
                        const maxIdx = Math.max(minIdx, Math.min(spectrumData.length, debug.range.maxIdx));

                        const bins = [] as PeakSearchDebug["bins"];
                        for (let i = minIdx; i < maxIdx; i++) {
                            bins.push({ idx: i, freqHz: freqBins[i] ?? 0, db: spectrumData[i] ?? -Infinity });
                        }

                        return {
                            pitch,
                            estFreqHz: debug.estFreqHz,
                            range: {
                                minIdx,
                                maxIdx,
                                minFreqHz: freqBins[minIdx] ?? 0,
                                maxFreqHz: freqBins[Math.max(minIdx, maxIdx - 1)] ?? 0,
                            },
                            peak: debug.peak,
                            bins,
                        };
                    })
                    .filter((v): v is PeakSearchDebug => v !== null);

                setPeakSearchDebug(debugList);
                hasPeakSearchDebugRef.current = true;
            }
        } else if (hasPeakSearchDebugRef.current) {
            setPeakSearchDebug(null);
            hasPeakSearchDebugRef.current = false;
        }

        animationFrameIdRef.current = requestAnimationFrame(analyzeFrame);
    }, [nodesRef, spectrumDataRef, freqBinsRef]);

    const startLoop = useCallback(() => {
        if (animationFrameIdRef.current !== null) return;
        debugFrameCountRef.current = 0;
        animationFrameIdRef.current = requestAnimationFrame(analyzeFrame);
    }, [analyzeFrame]);

    const stopLoop = useCallback(() => {
        if (animationFrameIdRef.current !== null) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
    }, []);

    const clearResults = useCallback(() => {
        setAnalysisResult(null);
        setCentDeviations(null);
        setPeakSearchDebug(null);
        hasPeakSearchDebugRef.current = false;
    }, []);

    // コンポーネントアンマウント時にループ停止
    useEffect(() => {
        return () => {
            if (animationFrameIdRef.current !== null) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
        };
    }, []);

    return {
        analysisResult,
        centDeviations,
        peakSearchDebug,
        startLoop,
        stopLoop,
        clearResults,
    };
}
