"use client";

import { useAtom } from "jotai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  evalRangeCentsAtom,
  a4FreqAtom,
  fftSizeAtom,
  smoothingTimeConstantAtom,
  sensitivityAtom,
  holdEnabledAtom,
  experimentModeAtom,
} from "@/lib/store";
import {
  SENSITIVITY_MIN,
  SENSITIVITY_MAX,
} from "@/lib/constants";

const FFT_SIZE_OPTIONS = [1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072];

export function SettingsForm() {
  // Jotai atoms を直接使用
  const [evalRange, setEvalRange] = useAtom(evalRangeCentsAtom);
  const [a4Freq, setA4Freq] = useAtom(a4FreqAtom);
  const [sensitivity, setSensitivity] = useAtom(sensitivityAtom);
  const [fftSize, setFftSize] = useAtom(fftSizeAtom);
  const [smoothingTimeConstant, setSmoothingTimeConstant] = useAtom(
    smoothingTimeConstantAtom
  );
  const [holdEnabled, setHoldEnabled] = useAtom(holdEnabledAtom);
  const [experimentMode, setExperimentMode] = useAtom(experimentModeAtom);

  const handleEvalRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setEvalRange(value);
    }
  };

  const handleA4FreqChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setA4Freq(value);
    }
  };

  const handleSensitivityChange = (value: number[]) => {
    if (value.length > 0) {
      setSensitivity(value[0]);
    }
  };

  const handleFftSizeChange = (value: string) => {
    const intValue = parseInt(value, 10);
    setFftSize(intValue);
  };

  const handleSmoothingTimeConstantChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0.0 && value <= 1.0) {
      setSmoothingTimeConstant(value);
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
            max="100"
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
            max="450"
          />
          <p className="text-sm text-gray-500 mt-1">
            基準となるA4の周波数を設定します。
          </p>
        </div>
        <div>
          <Label htmlFor="sensitivity">音量感度</Label>
          <Slider
            id="sensitivity"
            value={[sensitivity]}
            onValueChange={handleSensitivityChange}
            min={SENSITIVITY_MIN}
            max={SENSITIVITY_MAX}
            step={1}
            className="cursor-pointer mt-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>低（大きい音のみ）</span>
            <span className="font-medium text-foreground">{sensitivity}</span>
            <span>高（小さい音も検出）</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
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
                  <Select
                    value={fftSize.toString()}
                    onValueChange={handleFftSizeChange}
                  >
                    <SelectTrigger id="fftSize">
                      <SelectValue placeholder="FFTサイズを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {FFT_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={size.toString()}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                {/* 表示保持（ホールド）機能トグル */}
                <div className="flex items-center justify-between pt-2 border-t border-border mt-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="holdEnabled" className="cursor-pointer">
                      表示保持（ホールド）
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      音が途切れても約250ms表示を保持します。
                    </p>
                  </div>
                  <Switch
                    id="holdEnabled"
                    checked={holdEnabled}
                    onCheckedChange={setHoldEnabled}
                  />
                </div>
                {/* 実験用機能トグル */}
                <div className="flex items-center justify-between pt-2 border-t border-border mt-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="experimentMode" className="cursor-pointer">
                      実験用機能を使う
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      ログ記録・周波数観測パネルを表示します。
                    </p>
                  </div>
                  <Switch
                    id="experimentMode"
                    checked={experimentMode}
                    onCheckedChange={setExperimentMode}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
