import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { SettingsFormProps } from "@/lib/types";
import {
  A4_FREQ,
  EVAL_RANGE_CENTS,
  FFT_SIZE,
  SMOOTHING_TIME_CONSTANT,
  SENSITIVITY_DEFAULT,
  SENSITIVITY_MIN,
  SENSITIVITY_MAX,
  sensitivityToDb,
  dbToSensitivity,
} from "@/lib/constants";

export function SettingsForm({
  onEvalRangeChange,
  onA4FreqChange,
  onEvalThresholdChange,
  onFftSizeChange,
  onSmoothingTimeConstantChange, // 新しいプロップ
}: SettingsFormProps) {
  const [evalRange, setEvalRange] = useState(EVAL_RANGE_CENTS);
  const [a4Freq, setA4Freq] = useState(A4_FREQ);
  const [sensitivity, setSensitivity] = useState(SENSITIVITY_DEFAULT); // 感度として管理
  const [fftSize, setFftSize] = useState(FFT_SIZE); // FFT_SIZEのstate
  const [smoothingTimeConstant, setSmoothingTimeConstant] = useState(
    SMOOTHING_TIME_CONSTANT
  ); // SMOOTHING_TIME_CONSTANTのstate

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

    // localStorageからa4Freqを読み込む
    const savedA4Freq = localStorage.getItem("a4Freq");
    if (savedA4Freq) {
      const parsedValue = parseInt(savedA4Freq, 10);
      setA4Freq(parsedValue);
      onA4FreqChange(parsedValue);
    } else {
      onA4FreqChange(A4_FREQ);
    }

    // localStorageからevalThresholdを読み込む（後方互換性のため）
    // または感度として読み込む
    const savedSensitivity = localStorage.getItem("sensitivity");
    const savedEvalThreshold = localStorage.getItem("evalThreshold");

    if (savedSensitivity) {
      // 感度が保存されている場合
      const parsedValue = parseInt(savedSensitivity, 10);
      setSensitivity(parsedValue);
      onEvalThresholdChange(sensitivityToDb(parsedValue));
    } else if (savedEvalThreshold) {
      // 旧形式のdB値が保存されている場合は感度に変換
      const parsedValue = parseInt(savedEvalThreshold, 10);
      const convertedSensitivity = dbToSensitivity(parsedValue);
      setSensitivity(convertedSensitivity);
      onEvalThresholdChange(parsedValue);
      // 新形式で保存し直す
      localStorage.setItem("sensitivity", convertedSensitivity.toString());
    } else {
      // 何も保存されていない場合はデフォルト値
      setSensitivity(SENSITIVITY_DEFAULT);
      onEvalThresholdChange(sensitivityToDb(SENSITIVITY_DEFAULT));
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
    const savedSmoothingTimeConstant = localStorage.getItem(
      "smoothingTimeConstant"
    );
    if (savedSmoothingTimeConstant) {
      const parsedValue = parseFloat(savedSmoothingTimeConstant);
      setSmoothingTimeConstant(parsedValue);
      onSmoothingTimeConstantChange(parsedValue);
    } else {
      onSmoothingTimeConstantChange(SMOOTHING_TIME_CONSTANT);
    }
  }, [
    onEvalRangeChange,
    onA4FreqChange,
    onEvalThresholdChange,
    onFftSizeChange,
    onSmoothingTimeConstantChange,
  ]);

  const handleEvalRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setEvalRange(value);
      localStorage.setItem("evalRangeCents", value.toString());
      onEvalRangeChange(value);
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

  const handleSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setSensitivity(value);
      const dbValue = sensitivityToDb(value);
      localStorage.setItem("sensitivity", value.toString());
      onEvalThresholdChange(dbValue);
    }
  };

  const handleFftSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    // FFT_SIZEは2のべき乗である必要があるため、適切なバリデーションを追加
    if (
      !isNaN(value) &&
      (value & (value - 1)) === 0 &&
      value >= 32 &&
      value <= 32768
    ) {
      // 最小値と最大値を設定
      setFftSize(value);
      localStorage.setItem("fftSize", value.toString());
      onFftSizeChange(value);
    }
  };

  const handleSmoothingTimeConstantChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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
          <Label htmlFor="sensitivity">音量感度</Label>
          <Input
            id="sensitivity"
            type="range"
            value={sensitivity}
            onChange={handleSensitivityChange}
            min={SENSITIVITY_MIN}
            max={SENSITIVITY_MAX}
            step="1"
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>低（大きい音のみ）</span>
            <span className="font-medium text-foreground">{sensitivity}</span>
            <span>高（小さい音も検出）</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            小さい音も検出したい場合は感度を上げてください。
          </p>
        </div>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>高度な設定</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
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
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
