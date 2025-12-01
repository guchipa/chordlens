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
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const requestPendingRef = useRef<boolean>(false);

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
    
    // 設定変更をWorkletに通知
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({
        type: 'configure',
        fftSize,
        smoothingTimeConstant
      });
    }
  }, [currentPitchList, evalRangeCents, a4Freq, evalThreshold, fftSize, smoothingTimeConstant]);

  const startProcessing = useCallback(async () => {
    if (isProcessing) return;

    try {
      // AudioContextを初期化
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      // AudioWorkletモジュールを読み込み
      try {
        await audioContextRef.current.audioWorklet.addModule('/audio-processor.js');
      } catch (e) {
        console.error("Failed to load audio worklet", e);
        alert("AudioWorkletの読み込みに失敗しました。");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // MediaStreamSourceを作成
      const source = audioContextRef.current.createMediaStreamSource(stream);
      mediaStreamSourceRef.current = source;

      // AudioWorkletNodeを作成
      const workletNode = new AudioWorkletNode(audioContextRef.current, 'custom-analyser-processor');
      workletNodeRef.current = workletNode;

      // 初期設定を送信
      workletNode.port.postMessage({
        type: 'configure',
        fftSize,
        smoothingTimeConstant
      });

      source.connect(workletNode);
      workletNode.connect(audioContextRef.current.destination);

      const sampleRate = audioContextRef.current.sampleRate;
      // FFTサイズが変わる可能性があるため、freqBinsは動的に計算するか、
      // ここでは初期値として計算し、onmessage内で再計算することも検討できますが、
      // 簡易化のため初期fftSizeを使用します。
      // 注意: fftSizeが変更された場合、このfreqBinsは古くなります。
      // 正確に対応するには、onmessage内でfftSizeに応じたbinsを再計算する必要があります。
      // 今回はlatestPropsRefから取得するように修正します。

      // メッセージハンドラの設定
      workletNode.port.onmessage = (event) => {
        if (event.data.type === 'frequencyData') {
          const dataArray = event.data.data; // Float32Array
          requestPendingRef.current = false;

          const props = latestPropsRef.current;
          
          // freqBinsを現在のfftSizeに基づいて計算
          // (fftSizeが変更されている可能性があるため)
          const currentBufferLength = props.fftSize / 2;
          // dataArrayの長さと一致するか確認
          if (dataArray.length !== currentBufferLength) {
             // サイズ不一致の場合はスキップ（次のフレームで合うはず）
             return;
          }

          const freqBins = Array.from(
            { length: currentBufferLength },
            (_, i) => (sampleRate / 2) * (i / currentBufferLength)
          );

          const results = evaluateSpectrum(
            dataArray,
            freqBins,
            props.currentPitchList,
            props.evalRangeCents,
            props.a4Freq,
            props.evalThreshold
          );

          // deviation値とcentDeviationを分離
          setAnalysisResult(results.map((r) => r.deviation));
          setCentDeviations(results.map((r) => r.centDeviation));
        }
      };

      const analyzeLoop = () => {
        if (!workletNodeRef.current) return;

        if (!requestPendingRef.current) {
          requestPendingRef.current = true;
          workletNodeRef.current.port.postMessage({
            type: 'getFrequencyData',
            requestId: performance.now()
          });
        }

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
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsProcessing(false);
    setAnalysisResult(null);
    setCentDeviations(null);
    requestPendingRef.current = false;
  }, []);

  return {
    isProcessing,
    analysisResult,
    centDeviations,
    startProcessing,
    stopProcessing,
  };
}
