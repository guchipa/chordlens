'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod'

import { evaluateSpectrum } from '@/lib/audio_analysis/justAnalyze';
import { FFT_SIZE, PITCH_NAME_LIST, OCTAVE_NUM_LIST, SMOOTHING_TIME_CONSTANT } from '@/lib/constants';


const FormSchema = z.object({
  pitchName: z.string({ required_error: "音名を選択してください" }),
  octaveNum: z.number({ required_error: "オクターブ番号を選択してください" }),
  isRoot: z.boolean().optional(),
})

export type formtype = z.infer<typeof FormSchema>

export default function HomePage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const [analysisResult, setAnalysisResult] = useState<(number | null)[] | null>(null);
  const [currentPitchList, setCurrentPitchList] = useState<z.infer<typeof FormSchema>[]>([{ pitchName: "C", octaveNum: 4, isRoot: true }, { pitchName: "E", octaveNum: 4, isRoot: false }, { pitchName: "G", octaveNum: 4, isRoot: false }]); // 評価する音リスト

  const startProcessing = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!
      )();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      mediaStreamSourceRef.current = source; // ストリームソースを保持

      const analyser = audioContextRef.current.createAnalyser();
      analyserNodeRef.current = analyser;

      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT; // スペクトルの滑らかさ

      // マイク -> アナライザー -> （オーディオの再生はしないので destination には接続しない）
      source.connect(analyser);
      // source.connect(audioContextRef.current.destination); // リアルタイムで音を聞きたい場合

      const bufferLength = analyser.frequencyBinCount; // fftSize / 2
      const dataArray = new Float32Array(bufferLength); // 周波数データ用

      const sampleRate = audioContextRef.current.sampleRate;
      const freqBins: number[] = Array.from({ length: bufferLength }, (_, i) =>
        (sampleRate / 2) * (i / bufferLength)
      ); // 周波数ビンを計算

      const analyzeLoop = () => {
        if (!analyserNodeRef.current) return;

        analyserNodeRef.current.getFloatFrequencyData(dataArray); // 周波数データを取得

        // 移植した解析ロジックを呼び出す
        // dataArray は現在のスペクトル（spec に相当）
        // freqBins は周波数ビン（freq に相当）
        // t はリアルタイム処理では通常不要（または現在のタイムスタンプ）
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
  }, [currentPitchList]); // currentPitchList が変更されたら useCallback を再生成

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

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      isRoot: false,
    }
  })

  function onSubmit(data: z.infer<typeof FormSchema>) {
    setCurrentPitchList([...currentPitchList, data]);
  }

  return (
    <div className='p-20 flex flex-col gap-4'>
      <h1 className='text-3xl'>和音チューナー Web版</h1>
      <h2>マイクから音声を入力し、フロントエンドで解析します。</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col gap-4'>
          <FormField
            control={form.control}
            name="pitchName"
            render={({ field }) => (
              <FormItem className='flex flex-row items-center gap-16'>
                <span>音名</span>
                <Select onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue className='flex-grow' placeholder="音名を選んでください" />
                    </SelectTrigger>
                  </FormControl>
                  <FormMessage />
                  <SelectContent>
                    {PITCH_NAME_LIST.map((pitchName) => (
                      <SelectItem key={pitchName} value={pitchName}>{pitchName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='octaveNum'
            render={({ field }) => (
              <FormItem className='flex flex-row items-center gap-16'>
                <span>オクターブ</span>
                <Select onValueChange={val => field.onChange(Number(val))}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="オクターブ番号を選んでください" />
                    </SelectTrigger>
                  </FormControl>
                  <FormMessage />
                  <SelectContent>
                    {OCTAVE_NUM_LIST.map((octaveNum) => (
                      <SelectItem key={octaveNum} value={octaveNum.toString()}>{octaveNum}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='isRoot'
            render={({ field }) => (
              <FormItem className='flex flex-row items-center'>
                <span>根音</span>
                <FormControl>
                  <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel>根音として追加</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type='submit'>追加</Button>
        </form>
      </Form>

      <span>
        現在の構成音（根音は<span className='text-sky-500'>青色</span>で表示）
      </span>
      <div className='flex flex-row items-center gap-4'>
        {currentPitchList.map((data, index) => (
          <p key={index} className={data.isRoot ? 'text-sky-500' : ''}>{data.pitchName}{data.octaveNum}</p>
        ))}
        <Button onClick={() => {setCurrentPitchList([])}}>クリア</Button>
      </div>

      <Button
        onClick={isProcessing ? stopProcessing : startProcessing}
        variant={isProcessing ? "destructive" : "default"}
        size='lg'
        className='max-w-lg'
      >
        {isProcessing ? '解析停止' : '解析開始'}
      </Button>

      {isProcessing && <p style={{ color: '#2980b9' }}>解析中...</p>}

      <div className='mt-5'>
        <h2 className='text-lg'>解析結果</h2>
        {analysisResult ? (
          <div>
            <ul>
              {analysisResult.map((val, index) => (
                <li key={index}>
                  {currentPitchList[index].pitchName + currentPitchList[index].octaveNum}: {val !== null ? `${val >= 0 ? '+' : ''}${(val * 100).toFixed(2)}%` : '検出なし'}
                </li>
              ))}
            </ul>
            {/* TODO: ここに Meter コンポーネントを配置 */}
          </div>
        ) : (
          <p>解析結果はここに表示されます。</p>
        )}
      </div>
    </div>
  );
}