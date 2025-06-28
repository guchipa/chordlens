"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// フォームバリデーション関連
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// 自作の解析ロジックと定数
import { evaluateSpectrum } from "@/lib/audio_analysis/justAnalyze";
import {
  FFT_SIZE,
  SMOOTHING_TIME_CONSTANT,
  DEFAULT_INITIAL_PITCH_LIST,
} from "@/lib/constants";

import { AppFooter } from "@/components/AppFooter";
import { PitchSettingForm } from "@/components/feature/PitchSettingForm";
import { PitchList } from "@/components/feature/PitchList";
import { AnalysisControl } from "@/components/feature/AnalysisControl";
import { AnalysisResult } from "@/components/feature/AnalysisResult";
import { FormSchema, formType } from "@/lib/schema";

export default function HomePage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const [analysisResult, setAnalysisResult] = useState<
    (number | null)[] | null
  >(null);
  // ユーザーが設定する評価対象音のリストを管理
  const [currentPitchList, setCurrentPitchList] = useState<formType[]>(DEFAULT_INITIAL_PITCH_LIST);

  // フォームの初期化
  const form = useForm<formType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      pitchName: "",
      octaveNum: 4,
      isRoot: false,
    },
  });

  // 音程解析の開始ロジック
  const startProcessing = useCallback(async () => {
    // 評価対象音が設定されていない場合は処理しない
    if (currentPitchList.length === 0) {
      alert("評価する音を一つ以上追加してください。");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext!)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      mediaStreamSourceRef.current = source;

      const analyser = audioContextRef.current.createAnalyser();
      analyserNodeRef.current = analyser;

      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;

      source.connect(analyser);

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

        // evaluateSpectrum の引数は formType[] を直接受け取るように調整済み
        const result = evaluateSpectrum(dataArray, freqBins, currentPitchList);
        setAnalysisResult(result);

        animationFrameIdRef.current = requestAnimationFrame(analyzeLoop);
      };

      animationFrameIdRef.current = requestAnimationFrame(analyzeLoop);
      setIsProcessing(true);
      console.log("Audio processing started...");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("マイクへのアクセスを許可してください。");
    }
  }, [currentPitchList]);

  // 音程解析の停止ロジック
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
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsProcessing(false);
    setAnalysisResult(null);
    console.log("Audio processing stopped.");
  }, []);

  // コンポーネントがアンマウントされたら処理を停止
  useEffect(() => {
    return () => {
      if (isProcessing) {
        stopProcessing();
      }
    };
  }, [isProcessing, stopProcessing]);

  // フォーム送信時の処理 (評価対象音の追加)
  function onSubmit(data: formType) {
    // 同じ音名・オクターブの音があれば更新、なければ追加
    setCurrentPitchList((prevList) => {
      const existingIndex = prevList.findIndex(
        (p) => p.pitchName === data.pitchName && p.octaveNum === data.octaveNum
      );
      if (existingIndex > -1) {
        const newList = [...prevList];
        newList[existingIndex] = { ...data }; // 新しいデータで更新
        return newList;
      }
      return [...prevList, data]; // 新規追加
    });
    form.reset({
      isRoot: false,
      pitchName: form.getValues("pitchName"),
      octaveNum: form.getValues("octaveNum"),
    }); // フォームをリセット (選択された音名は残す)
  }

  // 評価対象音をリストから削除する関数
  const removePitch = useCallback((indexToRemove: number) => {
    setCurrentPitchList((prevList) =>
      prevList.filter((_, index) => index !== indexToRemove)
    );
  }, []);

  const clearPitchList = useCallback(() => {
    setCurrentPitchList([]);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="container mx-auto flex flex-grow flex-col items-center gap-8 p-4 sm:p-8 md:p-12">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-800 sm:text-4xl">
            和音チューナー
          </h1>
          <h2 className="mt-2 max-w-2xl text-base text-gray-600 sm:text-lg">
            マイクから音声を入力し、設定した和音の純正律からの音程のズレをリアルタイムで解析します。
          </h2>
        </div>
        <PitchSettingForm form={form} onSubmit={onSubmit} />
        <PitchList currentPitchList={currentPitchList} removePitch={removePitch} clearPitchList={clearPitchList} />
        <AnalysisControl 
          isProcessing={isProcessing} 
          startProcessing={startProcessing} 
          stopProcessing={stopProcessing} 
          isPitchListEmpty={currentPitchList.length === 0} 
        />
        {isProcessing && (
          <p className="mt-4 font-medium text-blue-600">
            マイク入力からの解析中...
          </p>
        )}
        <AnalysisResult 
          isProcessing={isProcessing} 
          analysisResult={analysisResult} 
          currentPitchList={currentPitchList} 
        />
      </main>
      <AppFooter />
    </div>
  );
}
