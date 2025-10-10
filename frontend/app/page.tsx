"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// フォームバリデーション関連
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// 自作の解析ロジックと定数
import { evaluateSpectrum } from "@/lib/audio_analysis/justAnalyze";
import {
  FFT_SIZE, // FFT_SIZE をインポート
  SMOOTHING_TIME_CONSTANT, // SMOOTHING_TIME_CONSTANT をインポート
  DEFAULT_INITIAL_PITCH_LIST,
  EVAL_RANGE_CENTS,
  A4_FREQ,
  EVAL_THRESHOLD,
} from "@/lib/constants";

import { AppFooter } from "@/components/AppFooter";
import { PitchSettingForm } from "@/components/feature/PitchSettingForm";
import { PitchList } from "@/components/feature/PitchList";
import { AnalysisControl } from "@/components/feature/AnalysisControl";
import { AnalysisResult } from "@/components/feature/AnalysisResult";
import { SettingsForm } from "@/components/feature/SettingsForm";
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
  const [currentPitchList, setCurrentPitchList] = useState<formType[]>(
    DEFAULT_INITIAL_PITCH_LIST
  );

  // 音程評価範囲のstateを追加
  const [evalRangeCents, setEvalRangeCents] = useState(EVAL_RANGE_CENTS);
  // A4周波数のstateを追加
  const [a4Freq, setA4Freq] = useState(A4_FREQ);
  // スペクトル評価閾値のstateを追加
  const [evalThreshold, setEvalThreshold] = useState(EVAL_THRESHOLD);
  // FFTサイズのstateを追加
  const [fftSize, setFftSize] = useState(FFT_SIZE); // FFT_SIZEのstate
  // 平滑化定数のstateを追加
  const [smoothingTimeConstant, setSmoothingTimeConstant] = useState(
    SMOOTHING_TIME_CONSTANT
  ); // SMOOTHING_TIME_CONSTANTのstate

  // 設定パネルの開閉状態
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

      analyser.fftSize = fftSize; // stateのfftSizeを使用
      analyser.smoothingTimeConstant = smoothingTimeConstant; // stateのsmoothingTimeConstantを使用

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

        // evaluateSpectrum に a4Freq と evalThreshold を渡す
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
      console.log("Audio processing started...");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("マイクへのアクセスを許可してください。");
    }
  }, [
    currentPitchList,
    evalRangeCents,
    a4Freq,
    evalThreshold,
    fftSize,
    smoothingTimeConstant,
  ]);

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
      {/* Hamburger Button */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-white/50 backdrop-blur-sm hover:bg-gray-200"
        aria-label="設定を開く"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Settings Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-full max-w-sm bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isSettingsOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-xl font-bold">設定</h3>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="p-2 rounded-md hover:bg-gray-200"
            aria-label="設定を閉じる"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto h-[calc(100vh-65px)] space-y-8">
          <PitchSettingForm
            form={form}
            onSubmit={onSubmit}
            currentPitchList={currentPitchList}
          />
          <PitchList
            currentPitchList={currentPitchList}
            removePitch={removePitch}
            clearPitchList={clearPitchList}
            setCurrentPitchList={setCurrentPitchList}
          />
          <SettingsForm
            onEvalRangeChange={setEvalRangeCents}
            onA4FreqChange={setA4Freq}
            onEvalThresholdChange={setEvalThreshold}
            onFftSizeChange={setFftSize}
            onSmoothingTimeConstantChange={setSmoothingTimeConstant}
          />
        </div>
      </div>

      {/* Overlay */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setIsSettingsOpen(false)}
        ></div>
      )}

      <main className="container mx-auto flex flex-grow flex-col items-center gap-8 p-4 sm:p-8 md:p-12">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-800 sm:text-4xl">
            和音チューナー
          </h1>
          <h2 className="mt-2 max-w-2xl text-base text-gray-600 sm:text-lg">
            マイクから音声を入力し、設定した和音の純正律からの音程のズレをリアルタイムで解析します。
          </h2>
        </div>
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
          evalRangeCents={evalRangeCents}
          a4Freq={a4Freq}
        />
      </main>
      <AppFooter />
    </div>
  );
}
