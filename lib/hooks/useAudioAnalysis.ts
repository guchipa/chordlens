import { useRef, useCallback, useState, useEffect } from "react";
import { evaluateSpectrum } from "@/lib/audio_analysis/justAnalyze";
import type { UseAudioAnalysisProps } from "@/lib/types";

export function useAudioAnalysis({
  currentPitchList,
  evalRangeCents,
  a4Freq,
  evalThreshold,
  fftSize,
  smoothingTimeConstant,
}: UseAudioAnalysisProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<
    (number | null)[] | null
  >(null);
  const [centDeviations, setCentDeviations] = useState<
    (number | null)[] | null
  >(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const silentGainNodeRef = useRef<GainNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const spectrumDataRef = useRef<Float32Array | null>(null);
  const freqBinsRef = useRef<number[] | null>(null);
  const lastFreqBinsKeyRef = useRef<string | null>(null);

  // 最新のpropsを保持するref
  const latestPropsRef = useRef({
    currentPitchList,
    evalRangeCents,
    a4Freq,
    evalThreshold,
    fftSize,
    smoothingTimeConstant,
  });

  useEffect(() => {
    latestPropsRef.current = {
      currentPitchList,
      evalRangeCents,
      a4Freq,
      evalThreshold,
      fftSize,
      smoothingTimeConstant,
    };

    // 設定変更をAnalyserNodeに反映
    if (analyserNodeRef.current) {
      analyserNodeRef.current.fftSize = fftSize;
      analyserNodeRef.current.smoothingTimeConstant = smoothingTimeConstant;
      spectrumDataRef.current = new Float32Array(
        analyserNodeRef.current.frequencyBinCount
      );
      freqBinsRef.current = null;
      lastFreqBinsKeyRef.current = null;
    }
  }, [currentPitchList, evalRangeCents, a4Freq, evalThreshold, fftSize, smoothingTimeConstant]);

  const startProcessing = useCallback(async () => {
    if (isProcessing) return;

    try {
      // AudioContextを初期化
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // MediaStreamSourceを作成
      const source = audioContextRef.current.createMediaStreamSource(stream);
      mediaStreamSourceRef.current = source;

      // AnalyserNode（WebAudio内蔵FFT）を作成
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = smoothingTimeConstant;
      analyserNodeRef.current = analyser;

      // 音を鳴らさずに解析ノードを動かすためのサイレント経路
      const silentGain = audioContextRef.current.createGain();
      silentGain.gain.value = 0;
      silentGainNodeRef.current = silentGain;

      source.connect(analyser);
      analyser.connect(silentGain);
      silentGain.connect(audioContextRef.current.destination);

      spectrumDataRef.current = new Float32Array(analyser.frequencyBinCount);
      freqBinsRef.current = null;
      lastFreqBinsKeyRef.current = null;

      const analyzeLoop = () => {
        const ctx = audioContextRef.current;
        const analyserNode = analyserNodeRef.current;
        if (!ctx || !analyserNode) return;

        const props = latestPropsRef.current;

        // 設定変更を安全に追随
        if (analyserNode.fftSize !== props.fftSize) {
          analyserNode.fftSize = props.fftSize;
          spectrumDataRef.current = new Float32Array(
            analyserNode.frequencyBinCount
          );
          freqBinsRef.current = null;
          lastFreqBinsKeyRef.current = null;
        }
        if (analyserNode.smoothingTimeConstant !== props.smoothingTimeConstant) {
          analyserNode.smoothingTimeConstant = props.smoothingTimeConstant;
        }

        if (!spectrumDataRef.current || spectrumDataRef.current.length !== analyserNode.frequencyBinCount) {
          spectrumDataRef.current = new Float32Array(
            analyserNode.frequencyBinCount
          );
        }

        analyserNode.getFloatFrequencyData(spectrumDataRef.current);

        const sampleRate = ctx.sampleRate;
        const currentBufferLength = analyserNode.frequencyBinCount;
        const key = `${sampleRate}:${analyserNode.fftSize}`;
        if (!freqBinsRef.current || lastFreqBinsKeyRef.current !== key) {
          freqBinsRef.current = Array.from(
            { length: currentBufferLength },
            (_, i) => (sampleRate / 2) * (i / currentBufferLength)
          );
          lastFreqBinsKeyRef.current = key;
        }

        const results = evaluateSpectrum(
          spectrumDataRef.current,
          freqBinsRef.current,
          props.currentPitchList,
          props.evalRangeCents,
          props.a4Freq,
          props.evalThreshold
        );

        setAnalysisResult(results.map((r) => r.deviation));
        setCentDeviations(results.map((r) => r.centDeviation));

        animationFrameIdRef.current = requestAnimationFrame(analyzeLoop);
      };

      animationFrameIdRef.current = requestAnimationFrame(analyzeLoop);
      setIsProcessing(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("マイクへのアクセスを許可してください。");
    }
  }, [
    isProcessing,
    fftSize,
    smoothingTimeConstant,
  ]);

  const stopProcessing = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.mediaStream
        .getTracks()
        .forEach((track) => track.stop());
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (analyserNodeRef.current) {
      analyserNodeRef.current.disconnect();
      analyserNodeRef.current = null;
    }
    if (silentGainNodeRef.current) {
      silentGainNodeRef.current.disconnect();
      silentGainNodeRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsProcessing(false);
    setAnalysisResult(null);
    setCentDeviations(null);
    spectrumDataRef.current = null;
    freqBinsRef.current = null;
    lastFreqBinsKeyRef.current = null;
  }, []);

  return {
    isProcessing,
    analysisResult,
    centDeviations,
    startProcessing,
    stopProcessing,
  };
}
