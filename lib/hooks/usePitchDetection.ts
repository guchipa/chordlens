/**
 * マイク入力による音名推定カスタムフック
 *
 * ボタン押下で一定時間録音し、音名とオクターブを推定する。
 */

import { useState, useCallback, useRef } from "react";
import {
    detectPitch,
    aggregatePitchResults,
    type PitchCandidate,
} from "@/lib/audio_analysis/pitchDetection";
import { A4_FREQ } from "@/lib/constants";

export interface UsePitchDetectionOptions {
    /** 録音時間 (ms) デフォルト: 1500 */
    recordDuration?: number;
    /** A4基準周波数 (Hz) */
    a4Freq?: number;
    /** 解析間隔 (ms) デフォルト: 100 */
    analysisInterval?: number;
}

export interface UsePitchDetectionReturn {
    /** 録音中かどうか */
    isListening: boolean;
    /** 解析処理中かどうか */
    isProcessing: boolean;
    /** 推定結果（信頼度順、最大3件） */
    candidates: PitchCandidate[];
    /** エラーメッセージ */
    error: string | null;
    /** 録音開始 */
    startListening: () => Promise<void>;
    /** 状態リセット */
    reset: () => void;
}

/**
 * マイク入力による音名推定フック
 */
export function usePitchDetection(
    options: UsePitchDetectionOptions = {}
): UsePitchDetectionReturn {
    const {
        recordDuration = 1500,
        a4Freq = A4_FREQ,
        analysisInterval = 100,
    } = options;

    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [candidates, setCandidates] = useState<PitchCandidate[]>([]);
    const [error, setError] = useState<string | null>(null);

    // リソース管理用
    const audioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);

    /**
     * リソースをクリーンアップ
     */
    const cleanup = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        analyserRef.current = null;
    }, []);

    /**
     * 状態をリセット
     */
    const reset = useCallback(() => {
        cleanup();
        setIsListening(false);
        setIsProcessing(false);
        setCandidates([]);
        setError(null);
    }, [cleanup]);

    /**
     * 録音を開始して音名を推定
     */
    const startListening = useCallback(async () => {
        // 既存のリソースをクリーンアップ
        cleanup();
        setError(null);
        setCandidates([]);
        setIsListening(true);

        try {
            // マイクアクセスを取得
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
            });
            streamRef.current = stream;

            // AudioContextを作成
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;

            // AnalyserNodeを作成
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 4096; // 時間領域用に適度なサイズ
            analyserRef.current = analyser;

            // マイク入力を接続
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            const sampleRate = audioContext.sampleRate;
            const bufferLength = analyser.fftSize;
            const frameResults: PitchCandidate[][] = [];

            // 録音開始時刻
            const startTime = performance.now();

            // 定期的に解析を実行
            const analyzeFrame = () => {
                if (!analyserRef.current || !audioContextRef.current) {
                    return;
                }

                const elapsed = performance.now() - startTime;

                if (elapsed >= recordDuration) {
                    // 録音終了
                    setIsListening(false);
                    setIsProcessing(true);

                    // 結果を統合
                    const aggregatedResults = aggregatePitchResults(frameResults);
                    setCandidates(aggregatedResults);

                    // クリーンアップ
                    cleanup();
                    setIsProcessing(false);
                    return;
                }

                // 時間領域データを取得
                const dataArray = new Float32Array(bufferLength);
                analyserRef.current.getFloatTimeDomainData(dataArray);

                // 音名を推定
                const result = detectPitch(dataArray, sampleRate, a4Freq);
                if (result.length > 0) {
                    frameResults.push(result);
                }

                // 次のフレームをスケジュール
                setTimeout(analyzeFrame, analysisInterval);
            };

            // 解析開始
            analyzeFrame();
        } catch (err) {
            cleanup();
            setIsListening(false);
            setIsProcessing(false);

            if (err instanceof Error) {
                if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                    setError("マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。");
                } else if (err.name === "NotFoundError") {
                    setError("マイクが見つかりません。マイクが接続されているか確認してください。");
                } else {
                    setError(`マイクアクセスエラー: ${err.message}`);
                }
            } else {
                setError("マイクアクセス中に予期せぬエラーが発生しました。");
            }
        }
    }, [recordDuration, a4Freq, analysisInterval, cleanup]);

    return {
        isListening,
        isProcessing,
        candidates,
        error,
        startListening,
        reset,
    };
}
