import { useRef, useCallback, useState } from "react";
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

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const startProcessing = useCallback(async () => {
    if (isProcessing) return;
    
    try {
      // AudioContextを初期化
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // MediaStreamSourceとAnalyserNodeを作成
      const source = audioContextRef.current.createMediaStreamSource(stream);
      mediaStreamSourceRef.current = source;

      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = smoothingTimeConstant;
      source.connect(analyser);
      analyserNodeRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);

      const sampleRate = audioContextRef.current.sampleRate;
      const freqBins: number[] = Array.from(
        { length: bufferLength },
        (_, i) => (sampleRate / 2) * (i / bufferLength)
      );

      const analyzeLoop = () => {
        if (!analyserNodeRef.current) return;

        analyserNodeRef.current.getFloatFrequencyData(dataArray);

        const result = evaluateSpectrum(
          dataArray,
          freqBins,
          currentPitchList,
          evalRangeCents,
          a4Freq,
          evalThreshold
        );
        setAnalysisResult(result);

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
    currentPitchList,
    evalRangeCents,
    a4Freq,
    evalThreshold,
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
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsProcessing(false);
    setAnalysisResult(null);
  }, []);

  return {
    isProcessing,
    analysisResult,
    startProcessing,
    stopProcessing,
  };
}
