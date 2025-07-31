"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { A4_FREQ, EVAL_RANGE_CENTS, EVAL_THRESHOLD, FFT_SIZE, SMOOTHING_TIME_CONSTANT } from "@/lib/constants"; // FFT_SIZE と SMOOTHING_TIME_CONSTANT をインポート

interface SettingsFormProps {
  onEvalRangeChange: (value: number) => void;
  onGoodRangeChange: (value: number) => void;
  onA4FreqChange: (value: number) => void;
  onEvalThresholdChange: (value: number) => void;
  onFftSizeChange: (value: number) => void; // 新しいプロップ
  onSmoothingTimeConstantChange: (value: number) => void; // 新しいプロップ
}

export function SettingsForm({
  onEvalRangeChange,
  onGoodRangeChange,
  onA4FreqChange,
  onEvalThresholdChange,
  onFftSizeChange, // 新しいプロップ
  onSmoothingTimeConstantChange, // 新しいプロップ
}: SettingsFormProps) {
  const [evalRange, setEvalRange] = useState(EVAL_RANGE_CENTS);
  const [goodRangePercent, setGoodRangePercent] = useState(5);
  const [a4Freq, setA4Freq] = useState(A4_FREQ);
  const [evalThreshold, setEvalThreshold] = useState(EVAL_THRESHOLD);
  const [fftSize, setFftSize] = useState(FFT_SIZE); // FFT_SIZEのstate
  const [smoothingTimeConstant, setSmoothingTimeConstant] = useState(SMOOTHING_TIME_CONSTANT); // SMOOTHING_TIME_CONSTANTのstate

  useEffect(() => {
    // localStorageからevalRangeCentsを読み込む
    const savedEvalRange = localStorage.getItem("evalRangeCents");
    if (savedEvalRange) {
      const parsedValue = parseInt(savedEvalRange, 10);
      setEvalRange(parsedValue);
      onEvalRangeChange(parsedValue);
    } else {
      onEvalRangeChange(EVAL_RANGE_CENTS);
    }

    // localStorageからgoodRangePercentを読み込む
    const savedGoodRange = localStorage.getItem("goodRangePercent");
    if (savedGoodRange) {
      const parsedValue = parseInt(savedGoodRange, 10);
      setGoodRangePercent(parsedValue);
      onGoodRangeChange(parsedValue);
    } else {
      onGoodRangeChange(5);
    }

    // localStorageからa4Freqを読み込む
    const savedA4Freq = localStorage.getItem("a4Freq");
    if (savedA4Freq) {
      const parsedValue = parseInt(savedA4Freq, 10);
      setA4Freq(parsedValue);
      onA4FreqChange(parsedValue);
    } else {
      onA4FreqChange(A4_FREQ);
    }

    // localStorageからevalThresholdを読み込む
    const savedEvalThreshold = localStorage.getItem("evalThreshold");
    if (savedEvalThreshold) {
      const parsedValue = parseInt(savedEvalThreshold, 10);
      setEvalThreshold(parsedValue);
      onEvalThresholdChange(parsedValue);
    } else {
      onEvalThresholdChange(EVAL_THRESHOLD);
    }

    // localStorageからfftSizeを読み込む
    const savedFftSize = localStorage.getItem("fftSize");
    if (savedFftSize) {
      const parsedValue = parseInt(savedFftSize, 10);
      setFftSize(parsedValue);
      onFftSizeChange(parsedValue);
    } else {
      onFftSizeChange(FFT_SIZE);
    }

    // localStorageからsmoothingTimeConstantを読み込む
    const savedSmoothingTimeConstant = localStorage.getItem("smoothingTimeConstant");
    if (savedSmoothingTimeConstant) {
      const parsedValue = parseFloat(savedSmoothingTimeConstant);
      setSmoothingTimeConstant(parsedValue);
      onSmoothingTimeConstantChange(parsedValue);
    } else {
      onSmoothingTimeConstantChange(SMOOTHING_TIME_CONSTANT);
    }
  }, [onEvalRangeChange, onGoodRangeChange, onA4FreqChange, onEvalThresholdChange, onFftSizeChange, onSmoothingTimeConstantChange]);

  const handleEvalRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setEvalRange(value);
      localStorage.setItem("evalRangeCents", value.toString());
      onEvalRangeChange(value);
    }
  };

  const handleGoodRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setGoodRangePercent(value);
      localStorage.setItem("goodRangePercent", value.toString());
      onGoodRangeChange(value);
    }
  };

  const handleA4FreqChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setA4Freq(value);
      localStorage.setItem("a4Freq", value.toString());
      onA4FreqChange(value);
    }
  };

  const handleEvalThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setEvalThreshold(value);
      localStorage.setItem("evalThreshold", value.toString());
      onEvalThresholdChange(value);
    }
  };

  const handleFftSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    // FFT_SIZEは2のべき乗である必要があるため、適切なバリデーションを追加
    if (!isNaN(value) && (value & (value - 1)) === 0 && value >= 32 && value <= 32768) { // 最小値と最大値を設定
      setFftSize(value);
      localStorage.setItem("fftSize", value.toString());
      onFftSizeChange(value);
    }
  };

  const handleSmoothingTimeConstantChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0.0 && value <= 1.0) {
      setSmoothingTimeConstant(value);
      localStorage.setItem("smoothingTimeConstant", value.toString());
      onSmoothingTimeConstantChange(value);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>設定</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="evalRangeCents">音程評価範囲 (セント)</Label>
          <Input
            id="evalRangeCents"
            type="number"
            value={evalRange}
            onChange={handleEvalRangeChange}
            min="1"
            max="100" // 仮の最大値
          />
          <p className="text-sm text-gray-500 mt-1">
            ±この値の範囲で音程のズレを評価します。
          </p>
        </div>
        <div>
          <Label htmlFor="goodRangePercent">許容誤差範囲 (%)</Label>
          <Input
            id="goodRangePercent"
            type="number"
            value={goodRangePercent}
            onChange={handleGoodRangeChange}
            min="0"
            max="10" // 仮の最大値
          />
          <p className="text-sm text-gray-500 mt-1">
            この値以下のズレであれば「良い」と判断します。
          </p>
        </div>
        <div>
          <Label htmlFor="a4Freq">A4周波数 (Hz)</Label>
          <Input
            id="a4Freq"
            type="number"
            value={a4Freq}
            onChange={handleA4FreqChange}
            min="430"
            max="450" // 仮の範囲
          />
          <p className="text-sm text-gray-500 mt-1">
            基準となるA4の周波数を設定します。
          </p>
        </div>
        <div>
          <Label htmlFor="evalThreshold">スペクトル評価閾値 (dB)</Label>
          <Input
            id="evalThreshold"
            type="number"
            value={evalThreshold}
            onChange={handleEvalThresholdChange}
            min="-120"
            max="-30" // 仮の範囲
          />
          <p className="text-sm text-gray-500 mt-1">
            この値以下の音量では解析結果を表示しません。
          </p>
        </div>
        <div>
          <Label htmlFor="fftSize">FFTサイズ</Label>
          <Input
            id="fftSize"
            type="number"
            value={fftSize}
            onChange={handleFftSizeChange}
            min="32"
            max="32768"
            step="any" // 2のべき乗のみを許可するが、input type="number"ではstep="2"のように設定できないため、anyにしてバリデーションはonChangeで行う
          />
          <p className="text-sm text-gray-500 mt-1">
            周波数分解能に影響します (2のべき乗)。
          </p>
        </div>
        <div>
          <Label htmlFor="smoothingTimeConstant">平滑化定数</Label>
          <Input
            id="smoothingTimeConstant"
            type="number"
            value={smoothingTimeConstant}
            onChange={handleSmoothingTimeConstantChange}
            min="0.0"
            max="1.0"
            step="0.1"
          />
          <p className="text-sm text-gray-500 mt-1">
            スペクトルの変化の滑らかさを調整します (0.0-1.0)。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
