/**
 * useAudioContext - AudioContext の初期化・管理フック
 * 
 * 責務:
 * - AudioContext の作成・終了
 * - マイクストリームの取得
 * - AnalyserNode の設定
 */
import { useRef, useCallback, useEffect } from "react";

export interface AudioNodes {
    audioContext: AudioContext;
    analyserNode: AnalyserNode;
    mediaStreamSource: MediaStreamAudioSourceNode;
    silentGainNode: GainNode;
}

export interface UseAudioContextOptions {
    fftSize: number;
    smoothingTimeConstant: number;
}

export interface UseAudioContextReturn {
    /** オーディオノードへの参照 (null = 未初期化 or 停止中) */
    nodesRef: React.RefObject<AudioNodes | null>;
    /** スペクトラムデータ格納用バッファ */
    spectrumDataRef: React.RefObject<Float32Array | null>;
    /** 周波数ビン配列 */
    freqBinsRef: React.RefObject<number[] | null>;
    /** 処理を開始 */
    initialize: () => Promise<boolean>;
    /** 処理を終了・リソース解放 */
    cleanup: () => void;
    /** 設定更新（fftSize, smoothingTimeConstant） */
    updateSettings: (options: UseAudioContextOptions) => void;
}

export function useAudioContext(
    options: UseAudioContextOptions
): UseAudioContextReturn {
    const nodesRef = useRef<AudioNodes | null>(null);
    const spectrumDataRef = useRef<Float32Array | null>(null);
    const freqBinsRef = useRef<number[] | null>(null);
    const lastFreqBinsKeyRef = useRef<string | null>(null);

    // 最新の設定を保持
    const optionsRef = useRef(options);
    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    const initialize = useCallback(async (): Promise<boolean> => {
        // 既に初期化済みの場合はスキップ
        if (nodesRef.current) return true;

        try {
            // AudioContextを初期化
            const audioContext = new AudioContext();

            // マイクストリーム取得
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
            });

            // MediaStreamSourceを作成
            const mediaStreamSource = audioContext.createMediaStreamSource(stream);

            // AnalyserNode（WebAudio内蔵FFT）を作成
            const analyserNode = audioContext.createAnalyser();
            analyserNode.fftSize = optionsRef.current.fftSize;
            analyserNode.smoothingTimeConstant = optionsRef.current.smoothingTimeConstant;

            // 音を鳴らさずに解析ノードを動かすためのサイレント経路
            const silentGainNode = audioContext.createGain();
            silentGainNode.gain.value = 0;

            // ノード接続
            mediaStreamSource.connect(analyserNode);
            analyserNode.connect(silentGainNode);
            silentGainNode.connect(audioContext.destination);

            // DEBUG: AudioContext の状態をログ出力
            console.log("[AudioDebug] AudioContext state:", audioContext.state);
            console.log("[AudioDebug] Sample rate:", audioContext.sampleRate);
            console.log("[AudioDebug] FFT size:", analyserNode.fftSize);
            console.log("[AudioDebug] Frequency bin count:", analyserNode.frequencyBinCount);

            // バッファを初期化
            spectrumDataRef.current = new Float32Array(analyserNode.frequencyBinCount);
            freqBinsRef.current = null;
            lastFreqBinsKeyRef.current = null;

            nodesRef.current = {
                audioContext,
                analyserNode,
                mediaStreamSource,
                silentGainNode,
            };

            return true;
        } catch (error) {
            console.error("Error accessing microphone:", error);
            return false;
        }
    }, []);

    const cleanup = useCallback(() => {
        const nodes = nodesRef.current;
        if (!nodes) return;

        // メディアストリームを停止
        nodes.mediaStreamSource.mediaStream
            .getTracks()
            .forEach((track) => track.stop());
        nodes.mediaStreamSource.disconnect();

        // ノードを切断
        nodes.analyserNode.disconnect();
        nodes.silentGainNode.disconnect();

        // AudioContextを閉じる
        if (nodes.audioContext.state !== "closed") {
            nodes.audioContext.close();
        }

        // 参照をクリア
        nodesRef.current = null;
        spectrumDataRef.current = null;
        freqBinsRef.current = null;
        lastFreqBinsKeyRef.current = null;
    }, []);

    const updateSettings = useCallback((newOptions: UseAudioContextOptions) => {
        const nodes = nodesRef.current;
        if (!nodes) return;

        if (nodes.analyserNode.fftSize !== newOptions.fftSize) {
            nodes.analyserNode.fftSize = newOptions.fftSize;
            spectrumDataRef.current = new Float32Array(nodes.analyserNode.frequencyBinCount);
            freqBinsRef.current = null;
            lastFreqBinsKeyRef.current = null;
        }

        if (nodes.analyserNode.smoothingTimeConstant !== newOptions.smoothingTimeConstant) {
            nodes.analyserNode.smoothingTimeConstant = newOptions.smoothingTimeConstant;
        }
    }, []);

    // freqBinsの遅延計算用ヘルパー（useSpectrumAnalysisで使用）
    const ensureFreqBins = useCallback(() => {
        const nodes = nodesRef.current;
        if (!nodes) return;

        const sampleRate = nodes.audioContext.sampleRate;
        const fftSize = nodes.analyserNode.fftSize;
        const binCount = nodes.analyserNode.frequencyBinCount;
        const key = `${sampleRate}:${fftSize}`;

        if (!freqBinsRef.current || lastFreqBinsKeyRef.current !== key) {
            freqBinsRef.current = Array.from(
                { length: binCount },
                (_, i) => (sampleRate / 2) * (i / binCount)
            );
            lastFreqBinsKeyRef.current = key;
        }
    }, []);

    // spectrumData取得時に自動的にfreqBinsも更新
    useEffect(() => {
        if (nodesRef.current) {
            ensureFreqBins();
        }
    });

    return {
        nodesRef,
        spectrumDataRef,
        freqBinsRef,
        initialize,
        cleanup,
        updateSettings,
    };
}
