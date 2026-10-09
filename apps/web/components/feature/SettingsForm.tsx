"use client";

import { useAtom } from "jotai";
import {
  SettingsSection,
  FIELD_TOUCH,
  SELECT_TOUCH,
} from "@/components/layout/SettingsSection";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
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
  pitchAlgorithmAtom,
  swipeBandwidthCentsAtom,
} from "@/lib/store";
import {
  SENSITIVITY_MIN,
  SENSITIVITY_MAX,
  PITCH_ALGORITHMS,
  PITCH_ALGORITHM_LABELS,
  PITCH_ALGORITHM_DESCRIPTIONS,
} from "@chordlens/core/constants";

const A4_MIN = 430;
const A4_MAX = 450;
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
  const [pitchAlgorithm, setPitchAlgorithm] = useAtom(pitchAlgorithmAtom);
  const [swipeBandwidthCents, setSwipeBandwidthCents] = useAtom(swipeBandwidthCentsAtom);

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

  const stepA4 = (delta: number) => {
    setA4Freq(Math.min(A4_MAX, Math.max(A4_MIN, a4Freq + delta)));
  };

  const labelClass = "mb-1.5 block text-sm font-medium";
  const helpClass = "text-muted-foreground mt-1 text-xs";
  const itemClass = "min-h-11 text-base";

  return (
    <SettingsSection title="解析設定">
      <div className="space-y-5">
        <div>
          <Label htmlFor="pitchAlgorithm" className={labelClass}>
            アルゴリズム
          </Label>
          <Select
            value={pitchAlgorithm}
            onValueChange={(v) => setPitchAlgorithm(v as typeof pitchAlgorithm)}
          >
            <SelectTrigger id="pitchAlgorithm" className={`${SELECT_TOUCH} bg-background`}>
              <SelectValue placeholder="アルゴリズムを選択" />
            </SelectTrigger>
            <SelectContent>
              {PITCH_ALGORITHMS.map((alg) => (
                <SelectItem key={alg} value={alg} className={itemClass}>
                  {PITCH_ALGORITHM_LABELS[alg]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className={helpClass}>
            {PITCH_ALGORITHM_DESCRIPTIONS[pitchAlgorithm]}
          </p>
        </div>
        {pitchAlgorithm === "swipe" && (
          <div>
            <Label htmlFor="swipeBandwidthCents" className={labelClass}>
              バンドパス幅 (セント)
            </Label>
            <Input
              id="swipeBandwidthCents"
              type="number"
              inputMode="numeric"
              className={`${FIELD_TOUCH} bg-background`}
              value={swipeBandwidthCents}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v >= 100) setSwipeBandwidthCents(v);
              }}
              min="100"
              max="4800"
              step="100"
            />
            <p className={helpClass}>
              各構成音の周囲をこの幅でバンドパスフィルタします。広いほど倍音を含みます。
            </p>
          </div>
        )}
        <div>
          <Label htmlFor="evalRangeCents" className={labelClass}>
            音程評価範囲 (セント)
          </Label>
          <Input
            id="evalRangeCents"
            type="number"
            inputMode="numeric"
            className={`${FIELD_TOUCH} bg-background`}
            value={evalRange}
            onChange={handleEvalRangeChange}
            min="1"
            max="100"
          />
          <p className={helpClass}>±この値の範囲で音程のズレを評価します。</p>
        </div>
        <div>
          <Label htmlFor="a4Freq" className={labelClass}>
            A4周波数 (Hz)
          </Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="bg-background size-11 shrink-0"
              aria-label="A4周波数を1Hz下げる"
              onClick={() => stepA4(-1)}
              disabled={a4Freq <= A4_MIN}
            >
              <Minus className="size-4" />
            </Button>
            <Input
              id="a4Freq"
              type="number"
              inputMode="numeric"
              className={`${FIELD_TOUCH} bg-background text-center`}
              value={a4Freq}
              onChange={handleA4FreqChange}
              min={A4_MIN}
              max={A4_MAX}
            />
            <Button
              type="button"
              variant="outline"
              className="bg-background size-11 shrink-0"
              aria-label="A4周波数を1Hz上げる"
              onClick={() => stepA4(1)}
              disabled={a4Freq >= A4_MAX}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <p className={helpClass}>基準となるA4の周波数を設定します。</p>
        </div>
        <div>
          <Label htmlFor="sensitivity" className={labelClass}>
            音量感度
          </Label>
          <Slider
            id="sensitivity"
            value={[sensitivity]}
            onValueChange={handleSensitivityChange}
            min={SENSITIVITY_MIN}
            max={SENSITIVITY_MAX}
            step={1}
            className="mt-2 cursor-pointer py-3 [&_[role=slider]]:size-6"
          />
          <div className="text-muted-foreground mt-2 flex justify-between text-xs">
            <span>低（大きい音のみ）</span>
            <span className="text-foreground font-medium">{sensitivity}</span>
            <span>高（小さい音も検出）</span>
          </div>
          <p className={helpClass}>
            小さい音も検出したい場合は感度を上げてください。
          </p>
        </div>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1" className="border-b-0">
            <AccordionTrigger className="min-h-11 items-center py-2">
              高度な設定
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-5">
                <div>
                  <Label htmlFor="fftSize" className={labelClass}>
                    FFTサイズ
                  </Label>
                  <Select
                    value={fftSize.toString()}
                    onValueChange={handleFftSizeChange}
                  >
                    <SelectTrigger id="fftSize" className={`${SELECT_TOUCH} bg-background`}>
                      <SelectValue placeholder="FFTサイズを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {FFT_SIZE_OPTIONS.map((size) => (
                        <SelectItem
                          key={size}
                          value={size.toString()}
                          className={itemClass}
                        >
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className={helpClass}>
                    周波数分解能に影響します (2のべき乗)。
                  </p>
                </div>
                <div>
                  <Label htmlFor="smoothingTimeConstant" className={labelClass}>
                    平滑化定数
                  </Label>
                  <Input
                    id="smoothingTimeConstant"
                    type="number"
                    inputMode="decimal"
                    className={`${FIELD_TOUCH} bg-background`}
                    value={smoothingTimeConstant}
                    onChange={handleSmoothingTimeConstantChange}
                    min="0.0"
                    max="1.0"
                    step="0.1"
                  />
                  <p className={helpClass}>
                    スペクトルの変化の滑らかさを調整します (0.0-1.0)。
                  </p>
                </div>
                {/* 表示保持（ホールド）機能トグル */}
                <div className="border-border border-t pt-1">
                  <Label
                    htmlFor="holdEnabled"
                    className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 text-base"
                  >
                    表示保持（ホールド）
                    <Switch
                      id="holdEnabled"
                      size="touch"
                      checked={holdEnabled}
                      onCheckedChange={setHoldEnabled}
                    />
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    音が途切れても約250ms表示を保持します。
                  </p>
                </div>
                {/* 実験用機能トグル */}
                <div className="border-border border-t pt-1">
                  <Label
                    htmlFor="experimentMode"
                    className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 text-base"
                  >
                    実験用機能を使う
                    <Switch
                      id="experimentMode"
                      size="touch"
                      checked={experimentMode}
                      onCheckedChange={setExperimentMode}
                    />
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    ログ記録・周波数観測パネルを表示します。
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </SettingsSection>
  );
}
