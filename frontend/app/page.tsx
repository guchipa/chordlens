// frontend/app/page.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

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
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

// フォームバリデーション関連
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// 自作の解析ロジックと定数
import { evaluateSpectrum } from '@/lib/audio_analysis/justAnalyze';
import { FFT_SIZE, PITCH_NAME_LIST, OCTAVE_NUM_LIST, SMOOTHING_TIME_CONSTANT, DEFAULT_INITIAL_PITCH_LIST } from '@/lib/constants';

// 音程メーターコンポーネントをインポート
import { TunerMeter } from '@/components/TunerMeter'; // TunerMeter.tsx のパス

// shadcn/ui の Card コンポーネント (詳細解析結果リスト用)
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from '@/lib/utils'; // Tailwind CSS クラス結合用

// Form Schema の定義 (音名とオクターブ、根音かの入力用)
const FormSchema = z.object({
  pitchName: z.string({ required_error: "音名を選択してください" }),
  octaveNum: z.coerce.number({ required_error: "オクターブ番号を選択してください" }), // string->number変換
  isRoot: z.boolean().optional(),
});
export type formType = z.infer<typeof FormSchema>;

export default function HomePage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const [analysisResult, setAnalysisResult] = useState<(number | null)[] | null>(null);
  // ユーザーが設定する評価対象音のリストを管理
  const [currentPitchList, setCurrentPitchList] = useState<formType[]>(DEFAULT_INITIAL_PITCH_LIST);

  // フォームの初期化
  const form = useForm<formType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      pitchName: "",
      octaveNum: 4,
      isRoot: false,
    }
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
      audioContextRef.current = new (
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!
      )();
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
      const freqBins: number[] = Array.from({ length: bufferLength }, (_, i) =>
        (sampleRate / 2) * (i / bufferLength)
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
      mediaStreamSourceRef.current.mediaStream.getTracks().forEach(track => track.stop());
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
      const existingIndex = prevList.findIndex(p => p.pitchName === data.pitchName && p.octaveNum === data.octaveNum);
      if (existingIndex > -1) {
        const newList = [...prevList];
        newList[existingIndex] = { ...data }; // 新しいデータで更新
        return newList;
      }
      return [...prevList, data]; // 新規追加
    });
    form.reset({ isRoot: false, pitchName: form.getValues('pitchName'), octaveNum: form.getValues('octaveNum') }); // フォームをリセット (選択された音名は残す)
  }

  // 評価対象音をリストから削除する関数
  const removePitch = useCallback((indexToRemove: number) => {
    setCurrentPitchList(prevList => prevList.filter((_, index) => index !== indexToRemove));
  }, []);

  return (
    <div className='p-20 flex flex-col gap-8 items-center'> {/* 全体を中央寄せに調整 */}
      <h1 className='text-4xl font-extrabold text-gray-800'>和音チューナー Web版</h1>
      <h2 className='text-xl text-gray-600 text-center max-w-2xl'>
        マイクから音声を入力し、設定した和音の純正律からの音程のズレをリアルタイムで解析します。
      </h2>

      {/* 音程設定フォーム */}
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-2xl font-semibold mb-4 text-gray-700">評価する音の追加</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col gap-4'>
            <FormField
              control={form.control}
              name="pitchName"
              render={({ field }) => (
                <FormItem className='flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4'>
                  <FormLabel className='w-20'>音名</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className='flex-grow'>
                        <SelectValue placeholder="音名を選んでください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PITCH_NAME_LIST.map((pitchName) => (
                        <SelectItem key={pitchName} value={pitchName}>{pitchName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='octaveNum'
              render={({ field }) => (
                <FormItem className='flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4'>
                  <FormLabel className='w-20'>オクターブ</FormLabel>
                  <Select onValueChange={val => field.onChange(Number(val))} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger className='flex-grow'>
                        <SelectValue placeholder="オクターブ番号を選んでください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {OCTAVE_NUM_LIST.map((octaveNum) => (
                        <SelectItem key={octaveNum} value={octaveNum.toString()}>{octaveNum}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='isRoot'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center space-x-2 space-y-0'>
                  <FormControl>
                    <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className='leading-none'>根音として設定</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type='submit' className='w-full'>設定した音を追加</Button>
          </form>
        </Form>
      </div>

      {/* 現在の構成音リスト */}
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md mt-4">
        <h3 className="text-2xl font-semibold mb-4 text-gray-700">現在の評価対象音</h3>
        {currentPitchList.length === 0 ? (
          <p className="text-gray-500">まだ評価する音がありません。上のフォームから追加してください。</p>
        ) : (
          <div className='flex flex-wrap items-center gap-2'>
            {currentPitchList.map((data, index) => (
              <div key={`${data.pitchName}-${data.octaveNum}-${index}`} className="flex items-center space-x-2 bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                <span className={data.isRoot ? 'text-sky-600 font-bold' : ''}>
                  {data.pitchName}{data.octaveNum}
                  {data.isRoot && ' (R)'}
                </span>
                <Button variant="ghost" size="icon" onClick={() => removePitch(index)} className="w-4 h-4 p-0">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={() => setCurrentPitchList([])}>全てクリア</Button>
          </div>
        )}
      </div>

      {/* 解析開始/停止ボタン */}
      <div className="w-full max-w-md flex justify-center mt-6">
        <Button
          onClick={isProcessing ? stopProcessing : startProcessing}
          variant={isProcessing ? "destructive" : "default"}
          size='lg'
          className='min-w-[200px]'
          disabled={currentPitchList.length === 0 && !isProcessing}
        >
          {isProcessing ? '解析停止' : '解析開始'}
        </Button>
      </div>

      {isProcessing && <p className="text-blue-600 font-medium mt-4">マイク入力からの解析中...</p>}

      {/* --- メーター群と詳細解析結果リスト --- */}
      <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
        {/* 各音に対するメーターの描画 */}
        {currentPitchList.length > 0 ? (
          currentPitchList.map((pitchData, index) => (
            <div key={`${pitchData.pitchName}-${pitchData.octaveNum}-${index}`} className="col-span-1 flex justify-center">
              <TunerMeter
                pitchName={pitchData.pitchName}
                deviation={analysisResult?.[index] ?? null} // 各音に対応する解析結果を渡す
              />
            </div>
          ))
        ) : (
          !isProcessing && <p className="text-gray-500 text-center col-span-full">評価する音を追加して、解析を開始してください。</p>
        )}

        {/* 詳細な解析結果リスト（メーターの下にフル幅で表示） */}
        <div className="col-span-full">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>詳細な解析結果リスト</CardTitle>
            </CardHeader>
            <CardContent>
              {analysisResult ? (
                <ul>
                  {analysisResult.map((val, index) => {
                    const pitchData = currentPitchList[index];
                    if (!pitchData) return null; // データがない場合のエラー防止

                    const METER_GOOD_RANGE_PERCENT = 5; // 定数から取得するか、直接定義
                    const isGood = val !== null && Math.abs(val * 100) <= METER_GOOD_RANGE_PERCENT;
                    return (
                      <li key={`${pitchData.pitchName}-${pitchData.octaveNum}-${index}`} className="mb-1 text-gray-700 flex items-center">
                        <span className={cn("font-semibold mr-2", {
                          "text-sky-600": pitchData.isRoot
                        })}>
                          {pitchData.pitchName}{pitchData.octaveNum}{pitchData.isRoot ? ' (R)' : ''}
                        </span>: {' '}
                        {val !== null ? (
                          <span className={cn({
                            "text-green-600": isGood,
                            "text-orange-500": !isGood && Math.abs(val * 100) >= 10 && Math.abs(val * 100) < 30, // 10%～30%のずれ
                            "text-red-600": !isGood && Math.abs(val * 100) >= 30, // 30%以上のずれ
                          })}>
                            {`${val >= 0 ? '+' : ''}${(val * 100).toFixed(2)}%`}
                          </span>
                        ) : (
                          <span className="text-gray-500">検出なし</span>
                        )}
                        {val !== null && (
                          <span className={cn("ml-2 text-sm", {
                            "text-green-600": isGood,
                            "text-orange-500": !isGood && Math.abs(val * 100) >= 10 && Math.abs(val * 100) < 30,
                            "text-red-600": !isGood && Math.abs(val * 100) >= 30,
                          })}>
                            {isGood ? '✔' : '✖'}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-gray-500">解析結果はここに表示されます。</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}