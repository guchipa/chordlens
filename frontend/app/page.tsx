"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// shadcn/ui のフォーム関連コンポーネント
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

// フォームバリデーション関連
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

// 自作の解析ロジックと定数
import { evaluateSpectrum } from "@/lib/audio_analysis/justAnalyze";
import {
  FFT_SIZE,
  PITCH_NAME_LIST,
  OCTAVE_NUM_LIST,
  SMOOTHING_TIME_CONSTANT,
  DEFAULT_INITIAL_PITCH_LIST,
} from "@/lib/constants";

// 音程メーターコンポーネントをインポート
import { TunerMeter } from "@/components/TunerMeter"; // TunerMeter.tsx のパス

// shadcn/ui の Card コンポーネント (詳細解析結果リスト用)
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils"; // Tailwind CSS クラス結合用

// Form Schema の定義 (音名とオクターブ、根音かの入力用)
const FormSchema = z.object({
  pitchName: z.string({ required_error: "音名を選択してください" }),
  octaveNum: z.coerce.number({
    required_error: "オクターブ番号を選択してください",
  }), // string->number変換
  isRoot: z.boolean().optional(),
});
export type formType = z.infer<typeof FormSchema>;

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

  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center gap-8 p-4 sm:p-8 md:p-12">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-gray-800 sm:text-4xl">
          和音チューナー
        </h1>
        <h2 className="mt-2 max-w-2xl text-base text-gray-600 sm:text-lg">
          マイクから音声を入力し、設定した和音の純正律からの音程のズレをリアルタイムで解析します。
        </h2>
      </div>
      {/* 音程設定フォーム */}
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-md">
        <h3 className="mb-4 text-xl font-semibold text-gray-700 sm:text-2xl">
          評価する音の追加
        </h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pitchName"
              render={({ field }) => (
                <FormItem className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                  <FormLabel className="mb-1 whitespace-nowrap sm:mb-0 sm:w-24">
                    音名
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="音名を選んでください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PITCH_NAME_LIST.map((pitchName) => (
                        <SelectItem key={pitchName} value={pitchName}>
                          {pitchName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="sm:ml-28" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="octaveNum"
              render={({ field }) => (
                <FormItem className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                  <FormLabel className="mb-1 whitespace-nowrap sm:mb-0 sm:w-24">
                    オクターブ
                  </FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="オクターブ番号を選んでください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {OCTAVE_NUM_LIST.map((octaveNum) => (
                        <SelectItem
                          key={octaveNum}
                          value={octaveNum.toString()}
                        >
                          {octaveNum}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="sm:ml-28" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isRoot"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-2">
                  <FormControl>
                    <Checkbox
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                      id="is-root-checkbox"
                    />
                  </FormControl>
                  <FormLabel
                    htmlFor="is-root-checkbox"
                    className="cursor-pointer leading-none"
                  >
                    根音として設定
                  </FormLabel>
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              設定した音を追加
            </Button>
          </form>
        </Form>
      </div>
      {/* 現在の構成音リスト */}
      <div className="mt-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-md">
        <h3 className="mb-4 text-xl font-semibold text-gray-700 sm:text-2xl">
          現在の評価対象音
        </h3>
        {currentPitchList.length === 0 ? (
          <p className="text-gray-500">
            まだ評価する音がありません。上のフォームから追加してください。
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {currentPitchList.map((data, index) => (
              <div
                key={`${data.pitchName}-${data.octaveNum}-${index}`}
                className="flex items-center space-x-2 rounded-full bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-800"
              >
                <span
                  className={cn("whitespace-nowrap", {
                    "font-bold text-sky-700": data.isRoot,
                  })}
                >
                  {data.pitchName}
                  {data.octaveNum}
                  {data.isRoot && " (R)"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removePitch(index)}
                  className="h-5 w-5 rounded-full p-0 hover:bg-blue-200"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    ></path>
                  </svg>
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => setCurrentPitchList([])}
              className="mt-2 sm:mt-0"
            >
              全てクリア
            </Button>
          </div>
        )}
      </div>
      {/* 解析開始/停止ボタン */}
      <div className="mt-6 flex w-full max-w-lg justify-center">
        <Button
          onClick={isProcessing ? stopProcessing : startProcessing}
          variant={isProcessing ? "destructive" : "default"}
          size="lg"
          className="w-full sm:w-auto sm:min-w-[240px]"
          disabled={currentPitchList.length === 0 && !isProcessing}
        >
          {isProcessing ? "解析停止" : "解析開始"}
        </Button>
      </div>
      {isProcessing && (
        <p className="mt-4 font-medium text-blue-600">
          マイク入力からの解析中...
        </p>
      )}
      {/* --- メーター群と詳細解析結果リスト --- */}
      <div className="mt-8 grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {/* 各音に対するメーターの描画 */}
        {currentPitchList.length > 0
          ? currentPitchList.map((pitchData, index) => (
              <div
                key={`${pitchData.pitchName}-${pitchData.octaveNum}-${index}`}
                className="flex justify-center"
              >
                <TunerMeter
                  pitchName={`${pitchData.pitchName}${pitchData.octaveNum}`}
                  deviation={analysisResult?.[index] ?? null}
                />
              </div>
            ))
          : !isProcessing && (
              <div className="py-8 text-center text-gray-500 md:col-span-2 lg:col-span-3">
                <p>評価する音を追加して、解析を開始してください。</p>
              </div>
            )}

        {/* 詳細な解析結果リスト */}
        {analysisResult && currentPitchList.length > 0 && (
          <div className="md:col-span-2 lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>詳細な解析結果</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {currentPitchList.map((pitchData, index) => {
                    const val = analysisResult[index];
                    const METER_GOOD_RANGE_PERCENT = 5;
                    const isGood =
                      val !== null &&
                      Math.abs(val * 100) <= METER_GOOD_RANGE_PERCENT;

                    const deviationColor =
                      val === null
                        ? "text-gray-500"
                        : isGood
                        ? "text-green-600"
                        : Math.abs(val * 100) < 30
                        ? "text-orange-500"
                        : "text-red-600";

                    return (
                      <li
                        key={`${pitchData.pitchName}-${pitchData.octaveNum}-${index}`}
                        className="flex items-center justify-between rounded-md p-2 transition-colors duration-200 even:bg-gray-50"
                      >
                        <span
                          className={cn("whitespace-nowrap font-semibold", {
                            "text-sky-700": pitchData.isRoot,
                          })}
                        >
                          {pitchData.pitchName}
                          {pitchData.octaveNum}
                          {pitchData.isRoot && " (R)"}
                        </span>
                        <div className="flex items-center gap-4">
                          <span
                            className={cn(
                              "w-24 text-right font-mono",
                              deviationColor
                            )}
                          >
                            {val !== null
                              ? `${val >= 0 ? "+" : ""}${(val * 100).toFixed(
                                  2
                                )}%`
                              : "検出なし"}
                          </span>
                          {val !== null && (
                            <span className={cn("text-lg", deviationColor)}>
                              {isGood ? "✔" : "✖"}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
