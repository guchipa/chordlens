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
import { estimateF0WithSWIPE } from "@/lib/audio_analysis/swipePitchEstimation";
import { estimateF0WithPhaseVocoder } from "@/lib/audio_analysis/phaseVocoderEstimation";
import { getJustFrequencies } from "@/lib/audio_analysis/calcJustFreq";
import type { PeakSearchDebug, Pitch, AlgorithmComparisonEntry } from "@/lib/types";
import type { PitchAlgorithm } from "@/lib/constants";
import { SWIPE_BANDWIDTH_CENTS_DEFAULT } from "@/lib/constants";
import { getClientLogFps, sendVercelClientLog } from "@/lib/vercelClientLog";
import type { AudioNodes } from "./useAudioContext";

export interface SpectrumAnalysisOptions {
    currentPitchList: Pitch[];
    evalRangeCents: number;
    a4Freq: number;
    evalThreshold: number;
    pitchAlgorithm?: PitchAlgorithm;
    swipeBandwidthCents?: number;
    enableComparison?: boolean;
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
    /** FFT と SWIPE' の比較結果 (enableComparison=true のときのみ) */
    comparisonResults: AlgorithmComparisonEntry[] | null;
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
    const [comparisonResults, setComparisonResults] = useState<AlgorithmComparisonEntry[] | null>(null);

    const animationFrameIdRef = useRef<number | null>(null);
    const lastPeakDebugUpdateMsRef = useRef<number>(0);
    const hasPeakSearchDebugRef = useRef<boolean>(false);
    // SWIPE モード用の時間領域バッファ (analyserNode.fftSize と同サイズ)
    const timeDomainBufferRef = useRef<Float32Array | null>(null);

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

        const enableClientLog = import.meta.env.VITE_CLIENT_LOG === "1";

        // スペクトラムデータ取得
        if (spectrumData.length !== analyserNode.frequencyBinCount) {
            // サイズが変更された場合は次フレームで再試行
            animationFrameIdRef.current = requestAnimationFrame(analyzeFrame);
            return;
        }

        analyserNode.getFloatFrequencyData(spectrumData as Float32Array<ArrayBuffer>);

        // スペクトラム評価（アルゴリズムで分岐）
        const algo: PitchAlgorithm = props.pitchAlgorithm ?? "fft";
        const usesTimeDomain = algo === "swipe" || algo === "phasevocoder";
        let deviations: (number | null)[];
        let cents: (number | null)[];

        if (usesTimeDomain) {
            // SWIPE' / 位相ボコーダ: 時間領域データを使用
            const bufLen = analyserNode.fftSize;
            if (!timeDomainBufferRef.current || timeDomainBufferRef.current.length !== bufLen) {
                timeDomainBufferRef.current = new Float32Array(bufLen);
            }
            analyserNode.getFloatTimeDomainData(timeDomainBufferRef.current as Float32Array<ArrayBuffer>);

            let expectedFreqs: number[] = [];
            try {
                expectedFreqs = getJustFrequencies(props.currentPitchList, props.a4Freq);
            } catch {
                // 根音未設定などのエラーは null を返す
            }

            if (expectedFreqs.length === 0) {
                deviations = props.currentPitchList.map(() => null);
                cents = props.currentPitchList.map(() => null);
            } else {
                const estimatedF0s: (number | null)[] =
                    algo === "swipe"
                        ? estimateF0WithSWIPE(
                            timeDomainBufferRef.current,
                            audioContext.sampleRate,
                            expectedFreqs,
                            props.swipeBandwidthCents ?? SWIPE_BANDWIDTH_CENTS_DEFAULT
                        ).map((r) => r.estimatedF0)
                        : estimateF0WithPhaseVocoder(
                            timeDomainBufferRef.current,
                            audioContext.sampleRate,
                            expectedFreqs,
                            props.evalRangeCents * 2
                        ).map((r) => r.estimatedF0);

                cents = estimatedF0s.map((f0, i) =>
                    f0 === null ? null : 1200 * Math.log2(f0 / expectedFreqs[i])
                );
                deviations = cents.map((c) =>
                    c === null ? null : Math.max(-1, Math.min(1, c / props.evalRangeCents))
                );
            }
        } else {
            // FFT モード (既存の evaluateSpectrum)
            const results = evaluateSpectrum(
                spectrumData,
                freqBins,
                props.currentPitchList,
                props.evalRangeCents,
                props.a4Freq,
                props.evalThreshold,
                { includeDebug: props.enablePeakSearchDebug || enableClientLog }
            );
            deviations = results.map((r) => r.deviation);
            cents = results.map((r) => r.centDeviation);

            // ピーク探索デバッグ情報 (FFT モードのみ)
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

            // クライアントログ送信 (FFT モードのみ)
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
        }

        // 比較モード: FFT / SWIPE' / 位相ボコーダ を並列実行してエントリを生成
        if (props.enableComparison) {
            // FFT 結果
            const fftCents: (number | null)[] = evaluateSpectrum(
                spectrumData,
                freqBins,
                props.currentPitchList,
                props.evalRangeCents,
                props.a4Freq,
                props.evalThreshold
            ).map((e) => e.centDeviation);

            // 時間領域データ (SWIPE' / 位相ボコーダ共通)
            const bufLen = analyserNode.fftSize;
            if (!timeDomainBufferRef.current || timeDomainBufferRef.current.length !== bufLen) {
                timeDomainBufferRef.current = new Float32Array(bufLen);
            }
            analyserNode.getFloatTimeDomainData(timeDomainBufferRef.current as Float32Array<ArrayBuffer>);

            let expectedFreqs: number[] = [];
            try { expectedFreqs = getJustFrequencies(props.currentPitchList, props.a4Freq); } catch { /* noop */ }

            const toCents = (f0: number | null, i: number): number | null =>
                f0 === null ? null : 1200 * Math.log2(f0 / expectedFreqs[i]);

            const swipeCents: (number | null)[] =
                expectedFreqs.length === 0
                    ? props.currentPitchList.map(() => null)
                    : estimateF0WithSWIPE(
                        timeDomainBufferRef.current,
                        audioContext.sampleRate,
                        expectedFreqs,
                        props.swipeBandwidthCents ?? SWIPE_BANDWIDTH_CENTS_DEFAULT
                    ).map((r, i) => toCents(r.estimatedF0, i));

            const phaseVocoderCents: (number | null)[] =
                expectedFreqs.length === 0
                    ? props.currentPitchList.map(() => null)
                    : estimateF0WithPhaseVocoder(
                        timeDomainBufferRef.current,
                        audioContext.sampleRate,
                        expectedFreqs,
                        props.evalRangeCents * 2
                    ).map((r, i) => toCents(r.estimatedF0, i));

            setComparisonResults(
                props.currentPitchList.map((pitch, i) => ({
                    pitch,
                    fftCentDeviation: fftCents[i] ?? null,
                    swipeCentDeviation: swipeCents[i] ?? null,
                    phaseVocoderCentDeviation: phaseVocoderCents[i] ?? null,
                }))
            );
        } else if (comparisonResults !== null) {
            setComparisonResults(null);
        }

        setAnalysisResult(deviations);
        setCentDeviations(cents);

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
        setComparisonResults(null);
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
        comparisonResults,
        startLoop,
        stopLoop,
        clearResults,
    };
}
